// components/drill/Timeline.tsx
"use client";

import React, { useRef, useState } from "react";

type TimelineSet = {
  id: string;
  name: string;
  startCount: number;
  endCount: number;
};

type Props = {
  sets: TimelineSet[];
  playStartId: string;
  playEndId: string;
  currentCount: number;
  onScrub: (count: number) => void;
  onAddSetAtCurrent: () => void; // ★ 追加  
};

export default function Timeline({
  sets,
  playStartId,
  playEndId,
  currentCount,
  onScrub,
  onAddSetAtCurrent, // ★ 追加
}: Props) {
  if (!sets || sets.length === 0) return null;

  // ===== 1小節あたりのカウント数（ユーザー可変） =====
  const [countsPerMeasure, setCountsPerMeasure] = useState(8);

  // startCount 昇順
  const segments = [...sets].sort((a, b) => a.startCount - b.startCount);

  // 全体のカウント数（タイムライン最大値）
  const totalCounts =
    segments.reduce((max, s) => Math.max(max, s.endCount), 0) || 1;

  const startSeg = segments.find((s) => s.id === playStartId);
  const endSeg = segments.find((s) => s.id === playEndId);

  const rangeStart = startSeg?.startCount ?? 0;
  const rangeEnd = endSeg?.endCount ?? totalCounts;

  const pxPerCount = 4; // 拡大率
  const barWidth = Math.max(800, totalCounts * pxPerCount);

  const clampCount = (c: number) =>
    Math.min(Math.max(Math.round(c), 0), totalCounts);

  // スクラブ用
  const barRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const scrubAtClientX = (clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const count = x / pxPerCount;
    onScrub(clampCount(count));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    scrubAtClientX(e.clientX);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    scrubAtClientX(e.clientX);
  };
  const handleMouseUp = () => (isDraggingRef.current = false);
  const handleMouseLeave = () => (isDraggingRef.current = false);

  const playheadX = clampCount(currentCount) * pxPerCount;

  // ===== 目盛りの生成 =====
  const renderTicks = () => {
    const elems: React.ReactNode[] = [];

    for (let c = 0; c <= totalCounts; c++) {
      const x = c * pxPerCount;
      const isMeasure = c % countsPerMeasure === 0;

      // 目盛り線
      elems.push(
        <div
          key={`tick-${c}`}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            width: 1,
            height: isMeasure ? 14 : 7,
            backgroundColor: isMeasure ? "#9ca3af" : "#4b5563",
          }}
        />
      );

      // 「0, 8, 16...」などの数字
      if (isMeasure) {
        elems.push(
          <div
            key={`label-${c}`}
            style={{
              position: "absolute",
              left: x + 2,
              top: 14,
              fontSize: 10,
              color: "#e5e7eb",
              whiteSpace: "nowrap",
            }}
          >
            {c}
          </div>
        );
      }
    }

    return elems;
  };

  return (
    <div
      style={{
        width: 800,
        border: "1px solid #111827",
        borderRadius: 6,
        background: "#020617",
        color: "#ffffff",
        fontSize: 12,
        padding: "6px 8px 8px",
      }}
    >
      {/* ==== ヘッダー ==== */}
      <div
        style={{
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>Timeline</span>

        {/* ←→ ボタン + 現在カウント */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
          }}
        >
          <button
            type="button"
            onClick={() => onScrub(clampCount(currentCount - 1))}
            style={{
              padding: "1px 6px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid #4b5563",
              background: "#1f2937",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onScrub(clampCount(currentCount + 1))}
            style={{
              padding: "1px 6px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid #4b5563",
              background: "#1f2937",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            ▶
          </button>
          <button
      type="button"
      onClick={onAddSetAtCurrent}
      style={{
        marginLeft: 8,
        padding: "1px 8px",
        fontSize: 10,
        borderRadius: 4,
        border: "1px solid #4b5563",
        background: "#111827",
        color: "#e5e7eb",
        cursor: "pointer",
      }}
    >
      ＋Set
    </button>

          <span style={{ opacity: 0.85 }}>
            Count: {clampCount(currentCount)} / {totalCounts}
          </span>
        </div>

        {/* ★ 小節カウントの設定（ユーザー変更可能） */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, opacity: 0.8 }}>1小節のカウント:</span>
          <input
            type="number"
            min={1}
            max={64}
            value={countsPerMeasure}
            onChange={(e) =>
              setCountsPerMeasure(Math.max(1, Number(e.target.value)))
            }
            style={{
              width: 50,
              padding: "2px 4px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid #4b5563",
              background: "#1f2937",
              color: "#e5e7eb",
            }}
          />
        </div>
      </div>

      {/* ==== スクロール可能エリア ==== */}
      <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
        <div
          ref={barRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "relative",
            height: 64,
            width: barWidth,
            borderRadius: 4,
            background: "#111827",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* 目盛り */}
          <div style={{ position: "absolute", inset: 0 }}>{renderTicks()}</div>

          {/* 再生範囲 */}
          <div
            style={{
              position: "absolute",
              top: 24,
              height: 24,
              left: rangeStart * pxPerCount,
              width: (rangeEnd - rangeStart) * pxPerCount,
              background: "rgba(56, 189, 248, 0.25)",
              pointerEvents: "none",
            }}
          />

          {/* セット帯 */}
          {segments.map((s, index) => {
            const x = s.startCount * pxPerCount;
            const next = segments[index + 1];
            const endCount =
              s.endCount > s.startCount
                ? s.endCount
                : next
                ? next.startCount
                : s.startCount + countsPerMeasure;

            const duration = Math.max(endCount - s.startCount, 1);
            const minWidthPx = 56;
            const widthPx = Math.max(duration * pxPerCount, minWidthPx);

            const isStart = s.id === playStartId;
            const isEnd = s.id === playEndId;

            return (
              <div
                key={s.id}
                style={{
                  position: "absolute",
                  left: x,
                  top: 28,
                  width: widthPx,
                  height: 24,
                  borderRight: "1px solid #1f2937",
                  borderLeft: "1px solid #1f2937",
                  background: "#0f172a",
                  boxSizing: "border-box",
                  padding: "2px 6px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Set名 */}
                <div
                  style={{
                    fontSize: 10,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{s.name || s.id}</span>
                  {isStart && (
                    <span style={{ color: "#6ee7b7", fontSize: 9 }}>
                      START
                    </span>
                  )}
                  {isEnd && (
                    <span style={{ color: "#fb7185", fontSize: 9 }}>END</span>
                  )}
                </div>

                {/* count 表示 */}
                <span style={{ fontSize: 10, opacity: 0.8 }}>
                  {s.startCount}〜{endCount}
                </span>
              </div>
            );
          })}

          {/* 再生ヘッド */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 2,
              background: "#f87171",
              left: playheadX,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: -5,
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "7px solid #f87171",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
