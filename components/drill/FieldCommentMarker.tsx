// components/drill/FieldCommentMarker.tsx
"use client";

import { useState } from "react";
import type { WorldPos } from "@/lib/drill/types";

type Comment = {
  id: string;
  content: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  createdAt: string;
};

type Props = {
  comment: Comment;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  onOpenComment?: (comment: Comment) => void;
};

export default function FieldCommentMarker({
  comment,
  scale,
  canvasWidth,
  canvasHeight,
  onOpenComment,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  // ワールド座標をキャンバス座標に変換
  const canvasX = (comment.x / 50) * (canvasWidth / 14) * scale;
  const canvasY = (comment.y / 50) * (canvasHeight / 14) * scale;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer transition-all"
      style={{
        left: `${canvasX}px`,
        top: `${canvasY}px`,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenComment?.(comment)}
    >
      {/* コメントマーカー */}
      <div
        className={`relative transition-all ${
          isHovered ? "scale-125" : "scale-100"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">💬</span>
        </div>
        
        {/* ホバー時のツールチップ */}
        {isHovered && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
            <div className="text-xs text-slate-200 font-semibold mb-1">
              {comment.userName}
            </div>
            <div className="text-xs text-slate-300 line-clamp-2">
              {comment.content}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {new Date(comment.createdAt).toLocaleString("ja-JP")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { WorldPos } from "@/lib/drill/types";

type Comment = {
  id: string;
  content: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  createdAt: string;
};

type Props = {
  comment: Comment;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  onOpenComment?: (comment: Comment) => void;
};

export default function FieldCommentMarker({
  comment,
  scale,
  canvasWidth,
  canvasHeight,
  onOpenComment,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  // ワールド座標をキャンバス座標に変換
  const canvasX = (comment.x / 50) * (canvasWidth / 14) * scale;
  const canvasY = (comment.y / 50) * (canvasHeight / 14) * scale;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer transition-all"
      style={{
        left: `${canvasX}px`,
        top: `${canvasY}px`,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenComment?.(comment)}
    >
      {/* コメントマーカー */}
      <div
        className={`relative transition-all ${
          isHovered ? "scale-125" : "scale-100"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">💬</span>
        </div>
        
        {/* ホバー時のツールチップ */}
        {isHovered && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
            <div className="text-xs text-slate-200 font-semibold mb-1">
              {comment.userName}
            </div>
            <div className="text-xs text-slate-300 line-clamp-2">
              {comment.content}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {new Date(comment.createdAt).toLocaleString("ja-JP")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

