// app/api/drills/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: ドリル一覧取得
export async function GET() {
  try {
    // 認証チェック
    const user = await requireAuth();
    console.log("[API] GET /api/drills called by user:", user.id);
    
    console.log("[API] Prisma client initialized:", !!prisma);
    console.log("[API] DATABASE_URL exists:", !!process.env.DATABASE_URL);
    
    console.log("[API] Starting database query...");
    
    // 自分が作成したドリルまたは共同編集者として追加されたドリルを取得
    // まず、共同編集者として追加されたドリルIDを取得
    let collaboratorDrillIds: string[] = [];
    
    // PrismaクライアントにdrillCollaboratorが存在するか確認
    if (prisma && typeof prisma.drillCollaborator !== 'undefined') {
      try {
        const collaboratorDrills = await prisma.drillCollaborator.findMany({
          where: {
            userId: user.id,
          },
          select: {
            drillId: true,
          },
        });
        collaboratorDrillIds = collaboratorDrills.map((c) => c.drillId);
        console.log("[API] Found", collaboratorDrillIds.length, "collaborator drills");
      } catch (collabError) {
        console.error("[API] Error fetching collaborator drills:", collabError);
        // エラーが発生した場合は空配列を使用（自分が作成したドリルのみ表示）
        collaboratorDrillIds = [];
      }
    } else {
      console.warn("[API] prisma.drillCollaborator is not available, skipping collaborator query");
      // drillCollaboratorが存在しない場合は、自分が作成したドリルのみ表示
    }

    const drills = await prisma.drill.findMany({
      where: {
        OR: [
          { userId: user.id },
          {
            id: {
              in: collaboratorDrillIds,
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        sets: {
          orderBy: { startCount: "asc" },
        },
        members: {
          orderBy: { memberId: "asc" },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 各ドリルの共同編集者情報を取得（ユーザーの役割を確認）
    let collaboratorMap = new Map<string, string>();
    
    // PrismaクライアントにdrillCollaboratorが存在する場合のみ取得
    if (prisma && typeof prisma.drillCollaborator !== 'undefined' && drills.length > 0) {
      try {
        const allDrillIds = drills.map((d) => d.id);
        const userCollaborators = await prisma.drillCollaborator.findMany({
          where: {
            drillId: { in: allDrillIds },
            userId: user.id,
          },
          select: {
            drillId: true,
            role: true,
          },
        });

        // ドリルIDをキーとしたマップを作成
        collaboratorMap = new Map(
          userCollaborators.map((c) => [c.drillId, c.role])
        );
      } catch (collabError) {
        console.error("[API] Error fetching user collaborators:", collabError);
        // エラーが発生した場合は空のマップを使用
      }
    }

    // 各ドリルに役割情報を追加
    const drillsWithCollaboratorInfo = drills.map((drill) => {
      const userRole =
        drill.userId === user.id
          ? "owner"
          : collaboratorMap.get(drill.id) || null;

      return {
        ...drill,
        userRole,
      };
    });

    // レスポンス形式に変換
    const result = drillsWithCollaboratorInfo.map((drill) => ({
      id: drill.id,
      title: drill.title,
      dataName: drill.dataName,
      createdAt: drill.createdAt.toISOString(),
      updatedAt: drill.updatedAt.toISOString(),
      setsCount: drill.sets.length,
      membersCount: drill.members.length,
      ownerId: drill.userId,
      ownerName: drill.user?.name || drill.user?.email || "不明",
      isOwner: drill.userId === user.id,
      userRole: drill.userRole,
    }));

    console.log("[API] Query successful, returning", result.length, "drills");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to fetch drills:", error);
    
    // 認証エラーの場合は401を返す
    if (error instanceof AuthError) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: error.message,
        },
        { status: 401 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("[API] Error details:", errorDetails);
    console.error("[API] Error type:", error?.constructor?.name);
    console.error("[API] Error stringified:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Prismaエラーの詳細を取得
    let prismaError = null;
    if (error && typeof error === 'object' && 'code' in error) {
      prismaError = {
        code: (error as any).code,
        meta: (error as any).meta,
      };
      console.error("[API] Prisma error code:", (error as any).code);
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch drills",
        message: errorMessage,
        prismaError: prismaError,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

// POST: ドリル作成/保存
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await requireAuth();
    console.log("[API] POST /api/drills called by user:", user.id);
    
    // 動的インポートでPrismaクライアントを読み込む（エラーを回避）
    const prismaModule = await import("@/lib/prisma");
    const prisma = prismaModule.prisma;
    
    const body = await request.json();
    const { title, dataName, sets, members } = body;

    if (!sets || !Array.isArray(sets)) {
      return NextResponse.json(
        { error: "Sets are required" },
        { status: 400 }
      );
    }

    if (!members || !Array.isArray(members)) {
      return NextResponse.json(
        { error: "Members are required" },
        { status: 400 }
      );
    }

    // ドリルを作成
    const drill = await prisma.drill.create({
      data: {
        userId: user.id,
        title: title || "",
        dataName: dataName || "",
        sets: {
          create: sets.map((set: UiSet) => ({
            name: set.name,
            startCount: set.startCount,
            note: set.note || "",
            instructions: set.instructions || "",
            nextMove: set.nextMove || "",
            positions: set.positions as any,
            positionsByCount: set.positionsByCount as any,
          })),
        },
        members: {
          create: members.map((member: Member) => ({
            memberId: member.id,
            name: member.name,
            part: member.part,
            color: member.color || "#888888",
          })),
        },
      },
      include: {
        sets: true,
        members: true,
      },
    });

    return NextResponse.json({
      id: drill.id,
      title: drill.title,
      dataName: drill.dataName,
      createdAt: drill.createdAt.toISOString(),
      updatedAt: drill.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Failed to create drill:", error);
      
      // 認証エラーの場合は401を返す
      if (error instanceof AuthError) {
        return NextResponse.json(
          { 
            error: "Unauthorized",
            message: error.message,
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to create drill" },
        { status: 500 }
      );
    }
  }

