// app/api/drills/[id]/collaborators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: ドリルの共同編集者一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let resolvedParams: { id: string } | undefined;
  
  try {
    const user = await requireAuth();
    resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    // オーナーまたは共同編集者のみアクセス可能
    const isOwner = drill.userId === user.id;
    const isCollaborator = drill.collaborators.some(
      (c) => c.userId === user.id
    );

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      drill.collaborators.map((c) => ({
        id: c.id,
        userId: c.userId,
        role: c.role,
        user: c.user,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[API] Failed to fetch collaborators:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      drillId: resolvedParams?.id || "unknown",
    });
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
    return NextResponse.json(
      { 
        error: "Failed to fetch collaborators",
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          errorType: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : undefined,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

// POST: 共同編集者を追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: { userId?: string; role?: string } = {};
  let drillId: string | undefined;
  
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    drillId = resolvedParams.id;
    body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // ドリルのオーナーまたは編集者のみが共同編集者を追加可能
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    // オーナーまたは編集者のみが追加可能
    const isOwner = drill.userId === user.id;
    const userCollaborator = drill.collaborators[0];
    const isEditor = userCollaborator?.role === "editor";

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: "Only the owner or editors can add collaborators" },
        { status: 403 }
      );
    }

    // 既に共同編集者として追加されているかチェック
    const existingCollaborator = await prisma.drillCollaborator.findFirst({
      where: {
        drillId,
        userId,
      },
    });

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "このユーザーは既に共同編集者として追加されています", message: "User is already a collaborator" },
        { status: 409 }
      );
    }

    // ユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "指定されたユーザーが存在しません", message: "User not found" },
        { status: 404 }
      );
    }

    // 共同編集者を追加
    try {
      const collaborator = await prisma.drillCollaborator.create({
        data: {
          drillId,
          userId,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return NextResponse.json({
        id: collaborator.id,
        userId: collaborator.userId,
        role: collaborator.role,
        user: collaborator.user,
        createdAt: collaborator.createdAt.toISOString(),
      });
    } catch (createError) {
      console.error("[API] Failed to create collaborator:", createError);
      throw createError; // エラーハンドリングブロックで処理
    }
  } catch (error) {
    console.error("[API] Failed to add collaborator:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      drillId: drillId || "unknown",
      userId: body?.userId || "unknown",
      role: body?.role || "unknown",
    });
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    
    // Prismaのエラーを詳細に処理
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      console.error("[API] Prisma error:", {
        code: prismaError.code,
        meta: prismaError.meta,
      });
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "このユーザーは既に共同編集者として追加されています", message: "Duplicate entry" },
          { status: 409 }
        );
      }
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: "指定されたユーザーが存在しません", message: "User not found" },
          { status: 404 }
        );
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
    return NextResponse.json(
      { 
        error: "Failed to add collaborator", 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          errorType: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : undefined,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE: 共同編集者を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get("collaboratorId");

    if (!collaboratorId) {
      return NextResponse.json(
        { error: "collaboratorId is required" },
        { status: 400 }
      );
    }

    // ドリルのオーナーまたは編集者が共同編集者を削除可能
    // ただし、編集者は他の編集者を削除できない（オーナーのみ可能）
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    const isOwner = drill.userId === user.id;
    const userCollaborator = drill.collaborators[0];
    const isEditor = userCollaborator?.role === "editor";

    // 削除対象の共同編集者を取得
    const targetCollaborator = await prisma.drillCollaborator.findUnique({
      where: { id: collaboratorId },
      select: {
        role: true,
      },
    });

    if (!targetCollaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    // オーナーは誰でも削除可能、編集者は閲覧者のみ削除可能
    if (!isOwner && (!isEditor || targetCollaborator.role === "editor")) {
      return NextResponse.json(
        { error: "You don't have permission to remove this collaborator" },
        { status: 403 }
      );
    }

    await prisma.drillCollaborator.delete({
      where: { id: collaboratorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove collaborator:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}

