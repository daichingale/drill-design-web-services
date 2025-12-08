// app/api/drills/[id]/branches/[branchId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: ブランチを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> | { id: string; branchId: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const { id: drillId, branchId } = resolvedParams;

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
    const isCollaborator = drill.collaborators?.some(
      (c) => c.userId === user.id && c.role === "editor"
    ) || false;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ブランチを取得
    const branch = await prisma.drillBranch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    if (branch.drillId !== drillId) {
      return NextResponse.json(
        { error: "Branch does not belong to this drill" },
        { status: 400 }
      );
    }

    // 現在のブランチは削除できない
    if (branch.isCurrent) {
      return NextResponse.json(
        { error: "Cannot delete current branch" },
        { status: 400 }
      );
    }

    // ブランチを削除
    await prisma.drillBranch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete branch:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete branch",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT: ブランチを更新（主に切り替え用）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> | { id: string; branchId: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const { id: drillId, branchId } = resolvedParams;
    const body = await request.json();
    const { isCurrent } = body;

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
    const isCollaborator = drill.collaborators?.some(
      (c) => c.userId === user.id && c.role === "editor"
    ) || false;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ブランチを取得
    const branch = await prisma.drillBranch.findUnique({
      where: { id: branchId },
    });

    if (!branch || branch.drillId !== drillId) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    // 現在のブランチを切り替える場合、他のブランチのisCurrentをfalseにする
    if (isCurrent === true) {
      await prisma.drillBranch.updateMany({
        where: {
          drillId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    // ブランチを更新
    const updated = await prisma.drillBranch.update({
      where: { id: branchId },
      data: {
        isCurrent: isCurrent !== undefined ? isCurrent : branch.isCurrent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      drillId: updated.drillId,
      baseBranchId: updated.baseBranchId,
      isCurrent: updated.isCurrent,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      userId: updated.userId,
      userName: updated.user?.name || undefined,
    });
  } catch (error) {
    console.error("[API] Failed to update branch:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update branch",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

