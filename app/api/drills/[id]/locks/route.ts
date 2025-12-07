// app/api/drills/[id]/locks/route.ts
// 編集ロックの管理

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

// メモリ内でロックを管理（本番環境ではRedisなどを使用することを推奨）
const locks = new Map<string, {
  entityType: "member" | "set" | "drill";
  entityId: string;
  userId: string;
  timestamp: number;
  expiresAt: number;
}>();

// 期限切れのロックをクリーンアップ
function cleanupExpiredLocks() {
  const now = Date.now();
  locks.forEach((lock, key) => {
    if (now >= lock.expiresAt) {
      locks.delete(key);
    }
  });
}

// ロックキーを生成
function getLockKey(drillId: string, entityType: string, entityId: string): string {
  return `${drillId}:${entityType}:${entityId}`;
}

// POST: ロックを取得
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const body = await request.json();
    const { entityType, entityId, duration = 30000 } = body; // デフォルト30秒

    cleanupExpiredLocks();

    const lockKey = getLockKey(drillId, entityType, entityId);
    const existingLock = locks.get(lockKey);

    // 既存のロックをチェック
    if (existingLock && Date.now() < existingLock.expiresAt) {
      if (existingLock.userId !== user.id) {
        return NextResponse.json(
          {
            error: "Locked by another user",
            lockedBy: existingLock.userId,
            expiresAt: existingLock.expiresAt,
          },
          { status: 409 }
        );
      }
      // 自分のロックの場合は期限を延長
      existingLock.expiresAt = Date.now() + duration;
      return NextResponse.json({
        success: true,
        lockKey,
        expiresAt: existingLock.expiresAt,
      });
    }

    // 新しいロックを取得
    const lock = {
      entityType,
      entityId,
      userId: user.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    locks.set(lockKey, lock);

    return NextResponse.json({
      success: true,
      lockKey,
      expiresAt: lock.expiresAt,
    });
  } catch (error) {
    console.error("Failed to acquire lock:", error);
    return NextResponse.json(
      { error: "Failed to acquire lock" },
      { status: 500 }
    );
  }
}

// DELETE: ロックを解放
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const body = await request.json();
    const { entityType, entityId } = body;

    cleanupExpiredLocks();

    const lockKey = getLockKey(drillId, entityType, entityId);
    const existingLock = locks.get(lockKey);

    if (!existingLock) {
      return NextResponse.json({ success: true });
    }

    // 自分のロックのみ解放可能
    if (existingLock.userId !== user.id) {
      return NextResponse.json(
        { error: "Cannot release lock owned by another user" },
        { status: 403 }
      );
    }

    locks.delete(lockKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to release lock:", error);
    return NextResponse.json(
      { error: "Failed to release lock" },
      { status: 500 }
    );
  }
}

// GET: ロック状態を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    cleanupExpiredLocks();

    if (entityType && entityId) {
      // 特定のエンティティのロック状態を取得
      const lockKey = getLockKey(drillId, entityType, entityId);
      const lock = locks.get(lockKey);
      
      if (lock && Date.now() < lock.expiresAt) {
        return NextResponse.json({
          locked: true,
          lockedBy: lock.userId,
          isOwnedByMe: lock.userId === user.id,
          expiresAt: lock.expiresAt,
        });
      }
      
      return NextResponse.json({ locked: false });
    }

    // すべてのロックを取得
    const allLocks = Array.from(locks.entries())
      .filter(([key]) => key.startsWith(`${drillId}:`))
      .map(([key, lock]) => ({
        key,
        entityType: lock.entityType,
        entityId: lock.entityId,
        userId: lock.userId,
        isOwnedByMe: lock.userId === user.id,
        expiresAt: lock.expiresAt,
      }));

    return NextResponse.json({ locks: allLocks });
  } catch (error) {
    console.error("Failed to get locks:", error);
    return NextResponse.json(
      { error: "Failed to get locks" },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

// メモリ内でロックを管理（本番環境ではRedisなどを使用することを推奨）
const locks = new Map<string, {
  entityType: "member" | "set" | "drill";
  entityId: string;
  userId: string;
  timestamp: number;
  expiresAt: number;
}>();

// 期限切れのロックをクリーンアップ
function cleanupExpiredLocks() {
  const now = Date.now();
  locks.forEach((lock, key) => {
    if (now >= lock.expiresAt) {
      locks.delete(key);
    }
  });
}

// ロックキーを生成
function getLockKey(drillId: string, entityType: string, entityId: string): string {
  return `${drillId}:${entityType}:${entityId}`;
}

// POST: ロックを取得
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const body = await request.json();
    const { entityType, entityId, duration = 30000 } = body; // デフォルト30秒

    cleanupExpiredLocks();

    const lockKey = getLockKey(drillId, entityType, entityId);
    const existingLock = locks.get(lockKey);

    // 既存のロックをチェック
    if (existingLock && Date.now() < existingLock.expiresAt) {
      if (existingLock.userId !== user.id) {
        return NextResponse.json(
          {
            error: "Locked by another user",
            lockedBy: existingLock.userId,
            expiresAt: existingLock.expiresAt,
          },
          { status: 409 }
        );
      }
      // 自分のロックの場合は期限を延長
      existingLock.expiresAt = Date.now() + duration;
      return NextResponse.json({
        success: true,
        lockKey,
        expiresAt: existingLock.expiresAt,
      });
    }

    // 新しいロックを取得
    const lock = {
      entityType,
      entityId,
      userId: user.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    locks.set(lockKey, lock);

    return NextResponse.json({
      success: true,
      lockKey,
      expiresAt: lock.expiresAt,
    });
  } catch (error) {
    console.error("Failed to acquire lock:", error);
    return NextResponse.json(
      { error: "Failed to acquire lock" },
      { status: 500 }
    );
  }
}

// DELETE: ロックを解放
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const body = await request.json();
    const { entityType, entityId } = body;

    cleanupExpiredLocks();

    const lockKey = getLockKey(drillId, entityType, entityId);
    const existingLock = locks.get(lockKey);

    if (!existingLock) {
      return NextResponse.json({ success: true });
    }

    // 自分のロックのみ解放可能
    if (existingLock.userId !== user.id) {
      return NextResponse.json(
        { error: "Cannot release lock owned by another user" },
        { status: 403 }
      );
    }

    locks.delete(lockKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to release lock:", error);
    return NextResponse.json(
      { error: "Failed to release lock" },
      { status: 500 }
    );
  }
}

// GET: ロック状態を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: drillId } = await params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    cleanupExpiredLocks();

    if (entityType && entityId) {
      // 特定のエンティティのロック状態を取得
      const lockKey = getLockKey(drillId, entityType, entityId);
      const lock = locks.get(lockKey);
      
      if (lock && Date.now() < lock.expiresAt) {
        return NextResponse.json({
          locked: true,
          lockedBy: lock.userId,
          isOwnedByMe: lock.userId === user.id,
          expiresAt: lock.expiresAt,
        });
      }
      
      return NextResponse.json({ locked: false });
    }

    // すべてのロックを取得
    const allLocks = Array.from(locks.entries())
      .filter(([key]) => key.startsWith(`${drillId}:`))
      .map(([key, lock]) => ({
        key,
        entityType: lock.entityType,
        entityId: lock.entityId,
        userId: lock.userId,
        isOwnedByMe: lock.userId === user.id,
        expiresAt: lock.expiresAt,
      }));

    return NextResponse.json({ locks: allLocks });
  } catch (error) {
    console.error("Failed to get locks:", error);
    return NextResponse.json(
      { error: "Failed to get locks" },
      { status: 500 }
    );
  }
}

