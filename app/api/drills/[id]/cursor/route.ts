// app/api/drills/[id]/cursor/route.ts
// カーソル位置の更新と取得
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastChange } from "../sync/route";

// POST: カーソル位置を更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const body = await request.json();
    const { x, y } = body;

    // ユーザー情報を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });

    // ユーザーカラーを生成
    const colors = [
      "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
      "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    ];
    const hash = user.id.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const userColor = colors[Math.abs(hash) % colors.length];

    // カーソル位置をブロードキャスト
    await broadcastChange(drillId, {
      type: "cursor_move",
      userId: user.id,
      userName: userData?.name || userData?.email || "Unknown",
      userColor,
      data: { x, y },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update cursor position:", error);
    return NextResponse.json(
      { error: "Failed to update cursor position" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastChange } from "../sync/route";

// POST: カーソル位置を更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const body = await request.json();
    const { x, y } = body;

    // ユーザー情報を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });

    // ユーザーカラーを生成
    const colors = [
      "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
      "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    ];
    const hash = user.id.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const userColor = colors[Math.abs(hash) % colors.length];

    // カーソル位置をブロードキャスト
    await broadcastChange(drillId, {
      type: "cursor_move",
      userId: user.id,
      userName: userData?.name || userData?.email || "Unknown",
      userColor,
      data: { x, y },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update cursor position:", error);
    return NextResponse.json(
      { error: "Failed to update cursor position" },
      { status: 500 }
    );
  }
}

