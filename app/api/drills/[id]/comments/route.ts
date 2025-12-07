// app/api/drills/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: コメント一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: true,
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

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

    // コメントを取得（削除されていないもののみ）
    const comments = await prisma.comment.findMany({
      where: {
        drillId,
        deletedAt: null,
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        entityType: c.entityType,
        entityId: c.entityId,
        content: c.content,
        x: c.x,
        y: c.y,
        user: c.user,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[API] Failed to fetch comments:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      drillId: resolvedParams?.id,
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
        error: "Failed to fetch comments",
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

// POST: コメントを追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const body = await request.json();
    const { entityType, entityId, content, x, y } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: true,
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    const isOwner = drill.userId === user.id;
    const isCollaborator = drill.collaborators.some(
      (c) => c.userId === user.id && c.role !== "viewer"
    );

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // コメントを作成
    const comment = await prisma.comment.create({
      data: {
        drillId,
        userId: user.id,
        entityType: entityType || "drill",
        entityId: entityId || null,
        content: content.trim(),
        x: x || null,
        y: y || null,
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
      id: comment.id,
      userId: comment.userId,
      entityType: comment.entityType,
      entityId: comment.entityId,
      content: comment.content,
      x: comment.x,
      y: comment.y,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[API] Failed to create comment:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      drillId: resolvedParams?.id,
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
        error: "Failed to create comment",
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

