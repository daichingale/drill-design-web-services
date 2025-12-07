// app/api/drills/[id]/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 変更履歴を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    // 変更履歴を取得
    const history = await prisma.changeHistory.findMany({
      where: {
        drillId,
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
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(
      history.map((h) => ({
        id: h.id,
        action: h.action,
        entityType: h.entityType,
        entityId: h.entityId,
        changes: h.changes,
        user: h.user,
        createdAt: h.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[API] Failed to fetch history:", {
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
        error: "Failed to fetch history",
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

