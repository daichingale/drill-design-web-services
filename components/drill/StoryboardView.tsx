"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Stage, Layer, Circle, Line, Text, Rect } from "react-konva";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { STEP_M } from "@/lib/drill/utils";

type StoryboardViewProps = {
  sets: UiSet[];
  members: Member[];
  currentSetId: string;
  onSelectSet: (setId: string) => void;
  onReorderSet: (fromIndex: number, toIndex: number) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  fieldWidth: number;
  fieldHeight: number;
};

/**
 * ドリルストーリーボード表示コンポーネント
 */
export default function StoryboardView({
  sets,
  members,
  currentSetId,
  onSelectSet,
  onReorderSet,
  onDeleteSet,
  onAddSet,
  fieldWidth,
  fieldHeight,
}: StoryboardViewProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // セットをstartCountでソート
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);

  // ドラッグ開始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderSet(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full h-full bg-slate-900 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">ストーリーボード</h2>
          <p className="text-slate-400 text-sm">
            ドリルの全体像を一目で把握できます。セットをドラッグ&ドロップで順序変更できます。
          </p>
        </div>

        {/* ストーリーボードグリッド */}
        <div
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {sortedSets.map((set, index) => (
            <SetThumbnail
              key={set.id}
              set={set}
              members={members}
              index={index}
              isSelected={set.id === currentSetId}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onSelect={() => onSelectSet(set.id)}
              onDelete={() => onDeleteSet(set.id)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              fieldWidth={fieldWidth}
              fieldHeight={fieldHeight}
            />
          ))}

          {/* セット追加ボタン */}
          <button
            onClick={onAddSet}
            className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-800/50 hover:bg-slate-800 transition-colors group"
          >
            <div className="text-4xl mb-2 group-hover:text-emerald-400 transition-colors">+</div>
            <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
              セットを追加
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * セットサムネイルコンポーネント
 */
type SetThumbnailProps = {
  set: UiSet;
  members: Member[];
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  fieldWidth: number;
  fieldHeight: number;
};

function SetThumbnail({
  set,
  members,
  index,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  fieldWidth,
  fieldHeight,
}: SetThumbnailProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // サムネイルを生成
  useEffect(() => {
    const generateThumbnail = async () => {
      if (!thumbnailRef.current) return;

      // 高解像度で描画（Retina対応）
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scale = 0.6; // サムネイルサイズを大きく（0.3 → 0.6）
      const baseWidth = fieldWidth * scale;
      const baseHeight = fieldHeight * scale;
      
      const canvas = document.createElement("canvas");
      canvas.width = baseWidth * devicePixelRatio;
      canvas.height = baseHeight * devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 高解像度対応のスケーリング
      ctx.scale(devicePixelRatio, devicePixelRatio);

      // 背景
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // グリッド（より太く、見やすく）
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      for (let x = 0; x <= fieldWidth; x += STEP_M) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, baseHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= fieldHeight; y += STEP_M) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(baseWidth, y * scale);
        ctx.stroke();
      }

      // フィールド境界（より太く）
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, baseWidth, baseHeight);

      // メンバーを描画（サイズを大きく、見やすく）
      Object.entries(set.positions).forEach(([memberId, pos]) => {
        const member = members.find((m) => m.id === memberId);
        if (!member) return;

        const x = pos.x * scale;
        const y = pos.y * scale;
        const radius = Math.max(4, STEP_M * scale * 0.4); // スケールに応じた半径

        // メンバーの色で円を描画
        ctx.fillStyle = member.color || "#888888";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 境界線（より太く）
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // メンバー名を小さく表示（オプション）
        if (member.name && radius > 5) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `${Math.max(8, radius * 1.2)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // 名前が長すぎる場合は省略
          const displayName = member.name.length > 3 ? member.name.substring(0, 3) : member.name;
          ctx.fillText(displayName, x, y);
        }
      });

      // カンバスを画像に変換（高品質）
      const url = canvas.toDataURL("image/png", 1.0);
      setThumbnailUrl(url);
    };

    generateThumbnail();
  }, [set.positions, members, fieldWidth, fieldHeight]);

  return (
    <div
      ref={thumbnailRef}
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e);
      }}
      onDragEnd={onDragEnd}
      className={`relative h-64 rounded-lg border-2 bg-slate-800 cursor-move transition-all ${
        isSelected
          ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
          : "border-slate-700 hover:border-slate-600"
      } ${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-emerald-400 border-dashed" : ""}`}
      onClick={onSelect}
    >
      {/* サムネイル画像 */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Set ${index + 1}`}
          className="w-full h-full object-contain rounded-lg"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📐</div>
            <div className="text-xs">読み込み中...</div>
          </div>
        </div>
      )}

      {/* オーバーレイ情報 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-lg pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white mb-1">
                {set.name || `Set ${index + 1}`}
              </div>
              <div className="text-xs text-slate-300">
                Count {Math.round(set.startCount)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-xs pointer-events-auto transition-colors"
              title="セットを削除"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* インデックスバッジ */}
      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-slate-900/80 text-xs font-semibold text-slate-200">
        #{index + 1}
      </div>
    </div>
  );
}

