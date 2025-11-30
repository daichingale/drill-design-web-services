// app/api/drills/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";

// GET: 特定のドリル取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await requireAuth();
    
    // Next.js 16では、paramsはPromiseなので、awaitでアンラップする必要がある
    const { id } = await params;
    console.log("[API] GET /api/drills/[id] called, ID:", id, "by user:", user.id);
    
    // 動的インポートでPrismaクライアントを読み込む（エラーを回避）
    const { prisma } = await import("@/lib/prisma");
    console.log("[API] Prisma client imported successfully");
    
    const drill = await prisma.drill.findUnique({
      where: { id, userId: user.id },
      include: {
        sets: {
          orderBy: { startCount: "asc" },
        },
        members: {
          orderBy: { memberId: "asc" },
        },
      },
    });

    if (!drill) {
      console.log("[API] Drill not found, ID:", id);
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    console.log("[API] Drill found:", {
      id: drill.id,
      title: drill.title,
      setsCount: drill.sets.length,
      membersCount: drill.members.length,
    });

    // UI形式に変換
    const sets: UiSet[] = drill.sets.map((set) => ({
      id: set.id,
      name: set.name,
      startCount: set.startCount,
      positions: (set.positions as Record<string, { x: number; y: number }>) || {},
      positionsByCount: (set.positionsByCount as Record<number, Record<string, { x: number; y: number }>>) || undefined,
      note: set.note,
      instructions: set.instructions,
      nextMove: set.nextMove,
    }));

    const members: Member[] = drill.members.map((member) => ({
      id: member.memberId,
      name: member.name,
      part: member.part,
      color: member.color,
    }));

    const result = {
      id: drill.id,
      title: drill.title,
      dataName: drill.dataName,
      sets,
      members,
      createdAt: drill.createdAt.toISOString(),
      updatedAt: drill.updatedAt.toISOString(),
    };
    
    console.log("[API] Returning drill data:", {
      id: result.id,
      title: result.title,
      setsCount: result.sets.length,
      membersCount: result.members.length,
    });
    
            return NextResponse.json(result);
          } catch (error) {
            console.error("[API] Failed to fetch drill:", error);
            
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
            
            return NextResponse.json(
              { 
                error: "Failed to fetch drill",
                message: errorMessage,
                details: process.env.NODE_ENV === "development" ? errorDetails : undefined
              },
              { status: 500 }
            );
          }
        }

// PUT: ドリル更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await requireAuth();
    
    // Next.js 16では、paramsはPromiseなので、awaitでアンラップする必要がある
    const { id } = await params;
    
    // 動的インポートでPrismaクライアントを読み込む（エラーを回避）
    const { prisma } = await import("@/lib/prisma");
    
    const body = await request.json();
    const { title, dataName, sets, members } = body;

    // 既存のドリルを取得（ユーザー所有のドリルのみ）
    const existingDrill = await prisma.drill.findUnique({
      where: { id, userId: user.id },
      include: { sets: true, members: true },
    });

    if (!existingDrill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    // トランザクションで更新
    const updatedDrill = await prisma.$transaction(async (tx) => {
      // ドリル基本情報を更新
      const drill = await tx.drill.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existingDrill.title,
          dataName: dataName !== undefined ? dataName : existingDrill.dataName,
        },
      });

      // セットを更新（既存を削除して再作成）
      if (sets && Array.isArray(sets)) {
        await tx.set.deleteMany({ where: { drillId: id } });
        await tx.set.createMany({
          data: sets.map((set: UiSet) => ({
            drillId: id,
            name: set.name,
            startCount: set.startCount,
            note: set.note || "",
            instructions: set.instructions || "",
            nextMove: set.nextMove || "",
            positions: set.positions as any,
            positionsByCount: set.positionsByCount as any,
          })),
        });
      }

      // メンバーを更新（既存を削除して再作成）
      if (members && Array.isArray(members)) {
        await tx.member.deleteMany({ where: { drillId: id } });
        await tx.member.createMany({
          data: members.map((member: Member) => ({
            drillId: id,
            memberId: member.id,
            name: member.name,
            part: member.part,
            color: member.color || "#888888",
          })),
        });
      }

      return drill;
    });

            return NextResponse.json({
              id: updatedDrill.id,
              title: updatedDrill.title,
              dataName: updatedDrill.dataName,
              updatedAt: updatedDrill.updatedAt.toISOString(),
            });
          } catch (error) {
            console.error("Failed to update drill:", error);
            
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
              { error: "Failed to update drill" },
              { status: 500 }
            );
          }
        }

// DELETE: ドリル削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await requireAuth();
    
    // Next.js 16では、paramsはPromiseなので、awaitでアンラップする必要がある
    const { id } = await params;
    
    // 動的インポートでPrismaクライアントを読み込む（エラーを回避）
    const { prisma } = await import("@/lib/prisma");
    
    // ユーザー所有のドリルのみ削除可能
    await prisma.drill.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete drill:", error);
    return NextResponse.json(
      { error: "Failed to delete drill" },
      { status: 500 }
    );
  }
}

