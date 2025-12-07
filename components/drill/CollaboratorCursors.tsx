// components/drill/CollaboratorCursors.tsx
"use client";

import { useEffect, useState } from "react";
import type { WorldPos } from "@/lib/drill/types";

type CursorPosition = {
  userId: string;
  userName: string;
  userColor: string;
  position: WorldPos;
  timestamp: number;
};

type Props = {
  cursorPositions: CursorPosition[];
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
};

export default function CollaboratorCursors({
  cursorPositions,
  scale,
  canvasWidth,
  canvasHeight,
}: Props) {
  const [visibleCursors, setVisibleCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    // 5秒以内のカーソル位置のみ表示
    const now = Date.now();
    const filtered = cursorPositions.filter(
      (cursor) => now - cursor.timestamp < 5000
    );
    setVisibleCursors(filtered);
  }, [cursorPositions]);

  if (visibleCursors.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        width: canvasWidth * scale,
        height: canvasHeight * scale,
      }}
    >
      {visibleCursors.map((cursor) => {
        // ワールド座標をキャンバス座標に変換
        const canvasX = (cursor.position.x / 50) * (canvasWidth / 14) * scale;
        const canvasY = (cursor.position.y / 50) * (canvasHeight / 14) * scale;

        return (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-100"
            style={{
              left: `${canvasX}px`,
              top: `${canvasY}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* カーソルアイコン */}
            <div
              className="relative"
              style={{
                color: cursor.userColor,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              {/* ユーザー名ラベル */}
              <div
                className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-xs text-white"
                style={{
                  backgroundColor: cursor.userColor,
                }}
              >
                {cursor.userName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { WorldPos } from "@/lib/drill/types";

type CursorPosition = {
  userId: string;
  userName: string;
  userColor: string;
  position: WorldPos;
  timestamp: number;
};

type Props = {
  cursorPositions: CursorPosition[];
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
};

export default function CollaboratorCursors({
  cursorPositions,
  scale,
  canvasWidth,
  canvasHeight,
}: Props) {
  const [visibleCursors, setVisibleCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    // 5秒以内のカーソル位置のみ表示
    const now = Date.now();
    const filtered = cursorPositions.filter(
      (cursor) => now - cursor.timestamp < 5000
    );
    setVisibleCursors(filtered);
  }, [cursorPositions]);

  if (visibleCursors.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        width: canvasWidth * scale,
        height: canvasHeight * scale,
      }}
    >
      {visibleCursors.map((cursor) => {
        // ワールド座標をキャンバス座標に変換
        const canvasX = (cursor.position.x / 50) * (canvasWidth / 14) * scale;
        const canvasY = (cursor.position.y / 50) * (canvasHeight / 14) * scale;

        return (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-100"
            style={{
              left: `${canvasX}px`,
              top: `${canvasY}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* カーソルアイコン */}
            <div
              className="relative"
              style={{
                color: cursor.userColor,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              {/* ユーザー名ラベル */}
              <div
                className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-xs text-white"
                style={{
                  backgroundColor: cursor.userColor,
                }}
              >
                {cursor.userName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

