// components/drill/Timeline.tsx
"use client";

import React, { useRef } from "react";

type TimelineSet = {
  id: string;
  name: string;
  startCount: number;
  endCount: number;
};

// DrillPage から受け取る props
export type TimelineProps = {
  sets: TimelineSet[];
  playStartId: string;
  playEndId: string;
  onChangePlayStart: (id: string) => void;
  onChangePlayEnd: (id: string) => void;
  currentCount: number;
  isPlaying: boolean;
  onScrub: (count: number) => void;
  onStartPlay: () => void;
  onStopPlay: () => void;
  onAddSetAtCurrent: () => void;
};

// ===== ヘッダ部分（ボタン + 現在カウント表示） ======================

type HeaderProps = {
  currentCount: number;
  totalCounts: number;
  isPlaying: boolean;
  onStartPlay: () => void;
  onStopPlay: () => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  onAddSetAtCurrent?: () => void;
};

const TimelineHeader: React.FC<HeaderProps> = ({
  currentCount,
  totalCounts,
  isPlaying,
  onStartPlay,
  onStopPlay,
  onStepPrev,
  onStepNext,
  onAddSetAtCurrent,
}) => {
  return (
    <div
      style={{
        marginBottom: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      {/* 左：再生ボタン + ラベル（Pyware風） */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={isPlaying ? onStopPlay : onStartPlay}
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            border: "1px solid #22c55e",
            backgroundColor: isPlaying ? "#064e3b" : "#047857",
            color: "#ecfdf5",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isPlaying ? "■" : "▶"}
        </button>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Timeline</span>
      </div>

      {/* 右：カウント / ステップ移動 / Set追加 */}
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
          onClick={onStepPrev}
          style={{
            padding: "1px 6px",
            fontSize: 10,
            borderRadius: 4,
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onStepNext}
          style={{
            padding: "1px 6px",
            fontSize: 10,
            borderRadius: 4,
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ▶
        </button>

        <span style={{ opacity: 0.85 }}>
          Count: {Math.round(currentCount)} / {totalCounts}
        </span>

        {onAddSetAtCurrent && (
          <button
            type="button"
            onClick={onAddSetAtCurrent}
            style={{
              marginLeft: 4,
              padding: "2px 8px",
              fontSize: 10,
              borderRadius: 999,
              border: "1px solid #22c55e",
              background: "#052e16",
              color: "#bbf7d0",
              cursor: "pointer",
            }}
          >
            ＋ Set
          </button>
        )}
      </div>
    </div>
  );
};

// ===== ルーラー（尺）部分 ==========================================

type RulerProps = {
  totalCounts: number;
  pxPerCount: number;
};

const TimelineRuler: React.FC<RulerProps> = ({ totalCounts, pxPerCount }) => {
  const ticks: number[] = [];
  const step = 4; // 4カウントごとに目盛り
  for (let c = 0; c <= totalCounts; c += step) {
    ticks.push(c);
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 16,
        borderBottom: "1px solid #374151",
        background:
          "linear-gradient(to bottom, rgba(15,23,42,0.9), rgba(15,23,42,0.8))",
      }}
    >
      {ticks.map((c) => {
        const x = c * pxPerCount;
        const isMajor = c % 8 === 0;
        return (
          <div key={c}>
            <div
              style={{
                position: "absolute",
                left: x,
                bottom: 0,
                width: 1,
                height: isMajor ? 8 : 5,
                backgroundColor: isMajor ? "#e5e7eb" : "#6b7280",
                opacity: isMajor ? 0.9 : 0.6,
              }}
            />
            {isMajor && c > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: x + 2,
                  bottom: 1,
                  fontSize: 9,
                  color: "#9ca3af",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ===== Set 帯（各 Set のブロック） ================================

type SegmentsRowProps = {
  segments: TimelineSet[];
  playStartId: string;
  playEndId: string;
  pxPerCount: number;
};

const TimelineSegmentsRow: React.FC<SegmentsRowProps> = ({
  segments,
  playStartId,
  playEndId,
  pxPerCount,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 16,
        bottom: 0,
        display: "flex",
        height: "auto",
      }}
    >
      {segments.map((s) => {
        const widthPx = Math.max((s.endCount - s.startCount) * pxPerCount, 1);
        const isStart = s.id === playStartId;
        const isEnd = s.id === playEndId;

        return (
          <div
            key={s.id}
            style={{
              width: widthPx,
              height: "100%",
              borderRight: "1px solid #374151",
              position: "relative",
              background: "#111827",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 4,
                top: 2,
                fontSize: 10,
                whiteSpace: "nowrap",
                color: "#e5e7eb",
              }}
            >
              {s.name || s.id}
            </span>
            <span
              style={{
                position: "absolute",
                left: 4,
                bottom: 2,
                fontSize: 10,
                opacity: 0.8,
                whiteSpace: "nowrap",
                color: "#9ca3af",
              }}
            >
              {s.startCount}〜{s.endCount}
            </span>

            {isStart && (
              <span
                style={{
                  position: "absolute",
                  right: 4,
                  top: 2,
                  fontSize: 9,
                  color: "#6ee7b7",
                }}
              >
                START
              </span>
            )}
            {isEnd && (
              <span
                style={{
                  position: "absolute",
                  right: 4,
                  bottom: 2,
                  fontSize: 9,
                  color: "#fb7185",
                }}
              >
                END
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ===== 再生範囲 & ヘッド ==========================================

type RangeProps = {
  rangeStart: number;
  rangeEnd: number;
  pxPerCount: number;
};

const PlayRangeOverlay: React.FC<RangeProps> = ({
  rangeStart,
  rangeEnd,
  pxPerCount,
}) => {
  const left = rangeStart * pxPerCount;
  const width = Math.max((rangeEnd - rangeStart) * pxPerCount, 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        bottom: 0,
        left,
        width,
        background: "rgba(56, 189, 248, 0.20)",
        pointerEvents: "none",
      }}
    />
  );
};

type PlayheadProps = {
  currentCount: number;
  pxPerCount: number;
};

const Playhead: React.FC<PlayheadProps> = ({ currentCount, pxPerCount }) => {
  const x = currentCount * pxPerCount;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 2,
        background: "#f97373",
        left: x,
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
          borderBottom: "7px solid #f97373",
        }}
      />
    </div>
  );
};

// ===== タイムライン本体（旧 Timeline） ============================

type BaseTimelineProps = {
  sets: TimelineSet[];
  playStartId: string;
  playEndId: string;
  currentCount: number;
  isPlaying: boolean;
  onScrub: (count: number) => void;
  onStartPlay: () => void;
  onStopPlay: () => void;
  onAddSetAtCurrent?: () => void;
};

const BaseTimeline: React.FC<BaseTimelineProps> = ({
  sets,
  playStartId,
  playEndId,
  currentCount,
  isPlaying,
  onScrub,
  onStartPlay,
  onStopPlay,
  onAddSetAtCurrent,
}) => {
  if (!sets || sets.length === 0) return null;

  const segments = [...sets].sort((a, b) => a.startCount - b.startCount);

  const totalCounts =
    segments.reduce((max, s) => Math.max(max, s.endCount), 0) || 1;

  const startSeg = segments.find((s) => s.id === playStartId);
  const endSeg = segments.find((s) => s.id === playEndId);

  const rangeStart = startSeg?.startCount ?? 0;
  const rangeEnd = endSeg?.endCount ?? totalCounts;

  const barRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const pxPerCount = 4;
  const barWidth = Math.max(800, totalCounts * pxPerCount);

  const clampCount = (c: number) => Math.min(Math.max(c, 0), totalCounts);

  const scrubAtClientX = (clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const count = Math.round(x / pxPerCount);
    onScrub(clampCount(count));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    isDraggingRef.current = true;
    scrubAtClientX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!isDraggingRef.current) return;
    scrubAtClientX(e.clientX);
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      style={{
        width: 800,
        border: "1px solid #4b5563",
        borderRadius: 8,
        background: "#020617",
        color: "#ffffff",
        fontSize: 12,
        padding: "6px 8px",
      }}
    >
      <TimelineHeader
        currentCount={currentCount}
        totalCounts={totalCounts}
        isPlaying={isPlaying}
        onStartPlay={onStartPlay}
        onStopPlay={onStopPlay}
        onStepPrev={() => onScrub(clampCount(currentCount - 1))}
        onStepNext={() => onScrub(clampCount(currentCount + 1))}
        onAddSetAtCurrent={onAddSetAtCurrent}
      />

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <div
          ref={barRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          style={{
            position: "relative",
            height: 56,
            width: barWidth,
            overflow: "hidden",
            borderRadius: 4,
            background: "#020617",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <TimelineRuler totalCounts={totalCounts} pxPerCount={pxPerCount} />

          <PlayRangeOverlay
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pxPerCount={pxPerCount}
          />

          <TimelineSegmentsRow
            segments={segments}
            playStartId={playStartId}
            playEndId={playEndId}
            pxPerCount={pxPerCount}
          />

          <Playhead
            currentCount={clampCount(currentCount)}
            pxPerCount={pxPerCount}
          />
        </div>
      </div>
    </div>
  );
};

// ===== ラッパー（範囲セレクト + BaseTimeline） ======================

export default function Timeline(props: TimelineProps) {
  const {
    sets,
    playStartId,
    playEndId,
    onChangePlayStart,
    onChangePlayEnd,
    currentCount,
    isPlaying,
    onScrub,
    onStartPlay,
    onStopPlay,
    onAddSetAtCurrent,
  } = props;

  const startSet = sets.find((s) => s.id === playStartId);
  const endSet = sets.find((s) => s.id === playEndId);

  return (
    <div className="space-y-2">
      {/* 再生範囲ヘッダ（Set3 → Set6 が見えるところ） */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-slate-300">再生範囲:</span>
          <select
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
            value={playStartId}
            onChange={(e) => onChangePlayStart(e.target.value)}
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span>→</span>
          <select
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
            value={playEndId}
            onChange={(e) => onChangePlayEnd(e.target.value)}
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {startSet && endSet && (
          <div className="text-[11px] text-slate-400">
            ({startSet.name} {startSet.startCount}count → {endSet.name}{" "}
            {endSet.startCount}count)
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-300">
          <span>現在カウント: {Math.round(currentCount)}</span>
          <button
            type="button"
            onClick={onAddSetAtCurrent}
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 hover:bg-slate-800"
          >
            ＋ 現在のカウントに Set 挿入
          </button>
        </div>
      </div>

      {/* 本体のタイムライン（Pyware風） */}
      <BaseTimeline
        sets={sets}
        playStartId={playStartId}
        playEndId={playEndId}
        currentCount={currentCount}
        isPlaying={isPlaying}
        onScrub={onScrub}
        onStartPlay={onStartPlay}
        onStopPlay={onStopPlay}
        onAddSetAtCurrent={onAddSetAtCurrent}
      />
    </div>
  );
}
