// app/api/drills/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordChange } from "@/lib/drill/collaboration";
import { broadcastChange } from "./sync/route";

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
    
    if (!prisma) {
      console.error("[API] Prisma client is not initialized");
      throw new Error("Prisma client is not initialized");
    }

    // ドリルを取得（idで検索、その後権限チェック）
    const drill = await prisma.drill.findFirst({
      where: {
        id,
      },
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

    if (!drill) {
      console.log("[API] Drill not found, ID:", id);
      return NextResponse.json(
        { error: "Drill not found", message: "指定されたドリルが見つかりません" },
        { status: 404 }
      );
    }

    // アクセス権限チェック
    const isOwner = drill.userId === user.id;
    
    // 共同編集者として追加されているか確認
    let isCollaborator = false;
    try {
      if (prisma.drillCollaborator) {
        const collaborator = await prisma.drillCollaborator.findFirst({
          where: {
            drillId: id,
            userId: user.id,
          },
          select: {
            id: true,
          },
        });
        isCollaborator = !!collaborator;
        console.log("[API] Collaborator check result:", isCollaborator);
      }
    } catch (collabError) {
      console.error("[API] Error checking collaborator status:", collabError);
      // エラーが発生した場合は、共同編集者ではないとみなす
      isCollaborator = false;
    }

    if (!isOwner && !isCollaborator) {
      console.log("[API] Access denied, ID:", id, "User:", user.id);
      return NextResponse.json(
        { error: "Access denied", message: "このドリルにアクセスする権限がありません" },
        { status: 403 }
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
      userId: drill.userId,
      user: drill.user,
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
    
    
    const body = await request.json();
    const { title, dataName, sets, members, version, clientTimestamp } = body;
    
    console.log("[API] PUT /api/drills/[id] received:", {
      id,
      title,
      setsCount: sets?.length || 0,
      membersCount: members?.length || 0,
      memberIds: members?.map((m: any) => m.id) || [],
    });

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

    // バージョン競合チェック（簡易実装）
    // updatedAtをバージョンとして使用
    if (version && clientTimestamp) {
      const serverTimestamp = existingDrill.updatedAt.getTime();
      const clientTime = new Date(clientTimestamp).getTime();
      
      // クライアントのタイムスタンプがサーバーより古い場合は競合
      if (clientTime < serverTimestamp - 1000) { // 1秒のマージン
        return NextResponse.json(
          {
            error: "Version conflict",
            message: "ドリルが他のユーザーによって更新されています。最新の状態を取得してください。",
            serverVersion: serverTimestamp,
            clientVersion: clientTime,
          },
          { status: 409 }
        );
      }
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
        console.log("[API] Updating members:", {
          count: members.length,
          memberIds: members.map((m: Member) => m.id),
        });
        
        await tx.member.deleteMany({ where: { drillId: id } });
        const createdMembers = await tx.member.createMany({
          data: members.map((member: Member) => ({
            drillId: id,
            memberId: member.id,
            name: member.name,
            part: member.part,
            color: member.color || "#888888",
          })),
        });
        
        console.log("[API] Members created:", {
          count: createdMembers.count,
        });
      } else {
        console.warn("[API] Members array is missing or invalid:", members);
      }

      return drill;
    });

    // 変更履歴を記録
    await recordChange({
      drillId: id,
      userId: user.id,
      action: "update",
      entityType: "drill",
      changes: {
        title: title !== undefined ? title : existingDrill.title,
        dataName: dataName !== undefined ? dataName : existingDrill.dataName,
        setsCount: sets?.length || existingDrill.sets.length,
        membersCount: members?.length || existingDrill.members.length,
      },
    });

    // リアルタイム同期をブロードキャスト
    await broadcastChange(id, {
      type: "drill_updated",
      userId: user.id,
      data: {
        id: updatedDrill.id,
        title: updatedDrill.title,
        dataName: updatedDrill.dataName,
      },
      timestamp: new Date().toISOString(),
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

