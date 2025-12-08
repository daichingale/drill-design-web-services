// app/api/drills/[id]/branches/[branchId]/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareDrillVersions } from "@/lib/drill/versionCompare";

// POST: ブランチをマージ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> | { id: string; branchId: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const { id: drillId, branchId } = resolvedParams;
    const body = await request.json();
    const { targetBranchId } = body;

    if (!targetBranchId) {
      return NextResponse.json(
        { error: "Target branch ID is required" },
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
    const sourceBranch = await prisma.drillBranch.findUnique({
      where: { id: branchId },
    });

    const targetBranch = await prisma.drillBranch.findUnique({
      where: { id: targetBranchId },
    });

    if (!sourceBranch || !targetBranch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    if (sourceBranch.drillId !== drillId || targetBranch.drillId !== drillId) {
      return NextResponse.json(
        { error: "Branches do not belong to this drill" },
        { status: 400 }
      );
    }

    // 簡易実装: ブランチのマージは、実際にはドリルのデータをマージする必要がある
    // ここでは、マージの準備として、変更履歴に記録する
    // 実際のマージ処理は、ドリルのデータ構造に応じて実装が必要

    // 変更履歴に記録
    await prisma.changeHistory.create({
      data: {
        drillId,
        userId: user.id,
        action: "MERGE_BRANCH",
        entityType: "branch",
        entityId: branchId,
        changes: {
          sourceBranchId: branchId,
          targetBranchId: targetBranchId,
          mergedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Branch merge initiated",
    });
  } catch (error) {
    console.error("[API] Failed to merge branch:", {
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
        error: "Failed to merge branch",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

