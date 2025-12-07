// hooks/useCursorTracking.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WorldPos } from "@/lib/drill/types";

type CursorPosition = {
  userId: string;
  userName: string;
  userColor: string;
  position: WorldPos;
  timestamp: number;
};

type UseCursorTrackingOptions = {
  drillId: string | null;
  enabled?: boolean;
  onCursorUpdate?: (cursors: CursorPosition[]) => void;
};

// ユーザーカラーを生成（ユーザーIDから一貫した色を生成）
function getUserColor(userId: string): string {
  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];
  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

export function useCursorTracking({
  drillId,
  enabled = true,
  onCursorUpdate,
}: UseCursorTrackingOptions) {
  const { data: session } = useSession();
  const cursorPositionsRef = useRef<Map<string, CursorPosition>>(new Map());
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<WorldPos | null>(null);

  // カーソル位置を送信（スロットリング）
  const sendCursorPosition = useCallback(
    (position: WorldPos) => {
      if (!enabled || !drillId || !session?.user?.id) return;

      // 前回の位置と比較して、変化が小さい場合はスキップ
      if (lastSentPositionRef.current) {
        const dx = Math.abs(position.x - lastSentPositionRef.current.x);
        const dy = Math.abs(position.y - lastSentPositionRef.current.y);
        if (dx < 0.5 && dy < 0.5) return; // 0.5メートル未満の変化は無視
      }

      // スロットリング: 100msごとに送信
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      throttleTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/drills/${drillId}/cursor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: position.x, y: position.y }),
          });
          lastSentPositionRef.current = position;
        } catch (error) {
          console.error("Failed to send cursor position:", error);
        }
      }, 100);
    },
    [enabled, drillId, session?.user?.id]
  );

  // 他のユーザーのカーソル位置を更新
  const updateRemoteCursor = useCallback(
    (userId: string, position: WorldPos, userName?: string) => {
      if (userId === session?.user?.id) return; // 自分のカーソルは無視

      const cursor: CursorPosition = {
        userId,
        userName: userName || "Unknown",
        userColor: getUserColor(userId),
        position,
        timestamp: Date.now(),
      };

      cursorPositionsRef.current.set(userId, cursor);

      // コールバックを呼び出し
      const cursors = Array.from(cursorPositionsRef.current.values());
      onCursorUpdate?.(cursors);
    },
    [session?.user?.id, onCursorUpdate]
  );

  // 古いカーソル位置を削除
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let updated = false;

      cursorPositionsRef.current.forEach((cursor, userId) => {
        if (now - cursor.timestamp > 5000) {
          // 5秒以上更新されていないカーソルを削除
          cursorPositionsRef.current.delete(userId);
          updated = true;
        }
      });

      if (updated) {
        const cursors = Array.from(cursorPositionsRef.current.values());
        onCursorUpdate?.(cursors);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onCursorUpdate]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  return {
    sendCursorPosition,
    updateRemoteCursor,
  };
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WorldPos } from "@/lib/drill/types";

type CursorPosition = {
  userId: string;
  userName: string;
  userColor: string;
  position: WorldPos;
  timestamp: number;
};

type UseCursorTrackingOptions = {
  drillId: string | null;
  enabled?: boolean;
  onCursorUpdate?: (cursors: CursorPosition[]) => void;
};

// ユーザーカラーを生成（ユーザーIDから一貫した色を生成）
function getUserColor(userId: string): string {
  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];
  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

export function useCursorTracking({
  drillId,
  enabled = true,
  onCursorUpdate,
}: UseCursorTrackingOptions) {
  const { data: session } = useSession();
  const cursorPositionsRef = useRef<Map<string, CursorPosition>>(new Map());
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<WorldPos | null>(null);

  // カーソル位置を送信（スロットリング）
  const sendCursorPosition = useCallback(
    (position: WorldPos) => {
      if (!enabled || !drillId || !session?.user?.id) return;

      // 前回の位置と比較して、変化が小さい場合はスキップ
      if (lastSentPositionRef.current) {
        const dx = Math.abs(position.x - lastSentPositionRef.current.x);
        const dy = Math.abs(position.y - lastSentPositionRef.current.y);
        if (dx < 0.5 && dy < 0.5) return; // 0.5メートル未満の変化は無視
      }

      // スロットリング: 100msごとに送信
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      throttleTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/drills/${drillId}/cursor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: position.x, y: position.y }),
          });
          lastSentPositionRef.current = position;
        } catch (error) {
          console.error("Failed to send cursor position:", error);
        }
      }, 100);
    },
    [enabled, drillId, session?.user?.id]
  );

  // 他のユーザーのカーソル位置を更新
  const updateRemoteCursor = useCallback(
    (userId: string, position: WorldPos, userName?: string) => {
      if (userId === session?.user?.id) return; // 自分のカーソルは無視

      const cursor: CursorPosition = {
        userId,
        userName: userName || "Unknown",
        userColor: getUserColor(userId),
        position,
        timestamp: Date.now(),
      };

      cursorPositionsRef.current.set(userId, cursor);

      // コールバックを呼び出し
      const cursors = Array.from(cursorPositionsRef.current.values());
      onCursorUpdate?.(cursors);
    },
    [session?.user?.id, onCursorUpdate]
  );

  // 古いカーソル位置を削除
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let updated = false;

      cursorPositionsRef.current.forEach((cursor, userId) => {
        if (now - cursor.timestamp > 5000) {
          // 5秒以上更新されていないカーソルを削除
          cursorPositionsRef.current.delete(userId);
          updated = true;
        }
      });

      if (updated) {
        const cursors = Array.from(cursorPositionsRef.current.values());
        onCursorUpdate?.(cursors);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onCursorUpdate]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  return {
    sendCursorPosition,
    updateRemoteCursor,
  };
}

