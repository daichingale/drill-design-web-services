// app/api/drills/[id]/history/[historyId]/revert/route.ts
// 特定の変更を取り消す
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: 変更を取り消す
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> | { id: string; historyId: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const historyId = resolvedParams.historyId;

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
    const isEditor = drill.collaborators.some(
      (c) => c.userId === user.id && c.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 変更履歴を取得
    const history = await prisma.changeHistory.findUnique({
      where: { id: historyId },
    });

    if (!history || history.drillId !== drillId) {
      return NextResponse.json(
        { error: "History not found" },
        { status: 404 }
      );
    }

    // 変更の詳細を取得
    const details = history.details as any;

    // 変更を取り消す（逆の操作を実行）
    // 注意: これは簡易実装です。実際の実装では、より詳細なロジックが必要です。
    if (history.action === "MEMBER_MOVE") {
      // メンバーの位置を元に戻す
      const set = await prisma.set.findFirst({
        where: { drillId },
      });

      if (set && details.memberId && details.oldPosition) {
        const positions = set.positions as any;
        positions[details.memberId] = details.oldPosition;

        await prisma.set.update({
          where: { id: set.id },
          data: { positions },
        });
      }
    } else if (history.action === "SET_UPDATE") {
      // セットの変更を元に戻す
      if (details.setId && details.oldData) {
        await prisma.set.update({
          where: { id: details.setId },
          data: details.oldData,
        });
      }
    }

    // 取り消し操作を記録
    await prisma.changeHistory.create({
      data: {
        drillId,
        userId: user.id,
        action: "REVERT",
        details: {
          revertedHistoryId: historyId,
          originalAction: history.action,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revert change:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to revert change" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: 変更を取り消す
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> | { id: string; historyId: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const historyId = resolvedParams.historyId;

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
    const isEditor = drill.collaborators.some(
      (c) => c.userId === user.id && c.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 変更履歴を取得
    const history = await prisma.changeHistory.findUnique({
      where: { id: historyId },
    });

    if (!history || history.drillId !== drillId) {
      return NextResponse.json(
        { error: "History not found" },
        { status: 404 }
      );
    }

    // 変更の詳細を取得
    const details = history.details as any;

    // 変更を取り消す（逆の操作を実行）
    // 注意: これは簡易実装です。実際の実装では、より詳細なロジックが必要です。
    if (history.action === "MEMBER_MOVE") {
      // メンバーの位置を元に戻す
      const set = await prisma.set.findFirst({
        where: { drillId },
      });

      if (set && details.memberId && details.oldPosition) {
        const positions = set.positions as any;
        positions[details.memberId] = details.oldPosition;

        await prisma.set.update({
          where: { id: set.id },
          data: { positions },
        });
      }
    } else if (history.action === "SET_UPDATE") {
      // セットの変更を元に戻す
      if (details.setId && details.oldData) {
        await prisma.set.update({
          where: { id: details.setId },
          data: details.oldData,
        });
      }
    }

    // 取り消し操作を記録
    await prisma.changeHistory.create({
      data: {
        drillId,
        userId: user.id,
        action: "REVERT",
        details: {
          revertedHistoryId: historyId,
          originalAction: history.action,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revert change:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to revert change" },
      { status: 500 }
    );
  }
}

