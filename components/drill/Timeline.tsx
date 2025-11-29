// components/drill/Timeline.tsx
"use client";

import React, { useRef } from "react";

type TimelineSet = {
  id: string;
  name: string;
  startCount: number;
  endCount: number;
};

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
  confirmedCounts?: number[]; // 確定されているカウントのリスト
};

/* ==================== Header ==================== */

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
    <div className="mb-1 flex items-center justify-between gap-2">
      {/* left: transport */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isPlaying ? onStopPlay : onStartPlay}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors ${
            isPlaying
              ? "bg-emerald-800/50 border border-emerald-600 text-emerald-100 hover:bg-emerald-800/70"
              : "bg-emerald-700/50 border border-emerald-500 text-emerald-100 hover:bg-emerald-700/70"
          }`}
        >
          {isPlaying ? "■" : "▶"}
        </button>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-200">
            Transport
          </span>
          <span className="text-[9px] text-slate-400">
            Play / Stop & step through counts
          </span>
        </div>
      </div>

      {/* right: counter & actions */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <button
          type="button"
          onClick={onStepPrev}
          className="px-1.5 py-0.5 rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 text-slate-200 hover:text-slate-100 transition-colors"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onStepNext}
          className="px-1.5 py-0.5 rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 text-slate-200 hover:text-slate-100 transition-colors"
        >
          ▶
        </button>

        <span className="opacity-90 text-[10px] px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-500/50 text-slate-200">
          <span className="uppercase text-[9px]">Count</span>{" "}
          {Math.round(currentCount)}{" "}
          <span className="opacity-70">/ {totalCounts}</span>
        </span>

        {onAddSetAtCurrent && (
          <button
            type="button"
            onClick={onAddSetAtCurrent}
            className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-600/50 text-emerald-200 hover:text-emerald-100 uppercase tracking-wider transition-colors"
          >
            + Set @ now
          </button>
        )}
      </div>
    </div>
  );
};

/* ==================== Ruler ==================== */

type RulerProps = {
  totalCounts: number;
  pxPerCount: number;
};

const TimelineRuler: React.FC<RulerProps> = ({ totalCounts, pxPerCount }) => {
  const ticks: number[] = [];
  const step = 4;
  for (let c = 0; c <= totalCounts; c += step) ticks.push(c);

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
          "linear-gradient(to bottom, rgba(15,23,42,0.95), rgba(15,23,42,0.85))",
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
                opacity: isMajor ? 0.9 : 0.5,
              }}
            />
            {isMajor && c > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: x + 2,
                  bottom: 1,
                  fontSize: 8,
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

/* ==================== Segments ==================== */

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
      }}
    >
      {segments.map((s, index) => {
        const widthPx = Math.max((s.endCount - s.startCount) * pxPerCount, 1);
        const isStart = s.id === playStartId;
        const isEnd = s.id === playEndId;

        return (
          <div
            key={`segment-${s.id}-${index}`}
            style={{
              width: widthPx,
              height: "100%",
              borderRight: "1px solid #374151",
              position: "relative",
              background:
                "linear-gradient(to right, rgba(15,23,42,0.9), rgba(15,23,42,0.95))",
              boxSizing: "border-box",
            }}
          >
            {/* Set name */}
            <span
              style={{
                position: "absolute",
                left: 6,
                top: 3,
                fontSize: 10,
                whiteSpace: "nowrap",
                color: "#e5e7eb",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {s.name || s.id}
            </span>

            {/* counts */}
            <span
              style={{
                position: "absolute",
                left: 6,
                bottom: 2,
                fontSize: 9,
                opacity: 0.8,
                whiteSpace: "nowrap",
                color: "#9ca3af",
              }}
            >
              {s.startCount} – {s.endCount}
            </span>

            {isStart && (
              <span
                style={{
                  position: "absolute",
                  right: 6,
                  top: 3,
                  fontSize: 8,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.16)",
                  border: "1px solid rgba(34,197,94,0.7)",
                  color: "#6ee7b7",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Start
              </span>
            )}
            {isEnd && (
              <span
                style={{
                  position: "absolute",
                  right: 6,
                  bottom: 3,
                  fontSize: 8,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: "rgba(248,113,113,0.16)",
                  border: "1px solid rgba(248,113,113,0.7)",
                  color: "#fecaca",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                End
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ==================== Range & Playhead ==================== */

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
        background:
          "linear-gradient(90deg, rgba(56,189,248,0.16), rgba(34,197,94,0.18))",
        borderRadius: 3,
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
        background: "#f9fafb",
        left: x,
        pointerEvents: "none",
        boxShadow: "0 0 4px rgba(248,250,252,0.8)",
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
          borderBottom: "7px solid #f9fafb",
        }}
      />
    </div>
  );
};

/* ==================== Base timeline ==================== */

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
  confirmedCounts?: number[]; // 確定されているカウントのリスト
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
  confirmedCounts = [],
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

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    isDraggingRef.current = true;
    scrubAtClientX(e.clientX);
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!isDraggingRef.current) return;
    scrubAtClientX(e.clientX);
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="w-full flex justify-center">
      <div
        style={{
          width: 800,
          maxWidth: "100%",
          border: "1px solid #4b5563",
          borderRadius: 10,
          background:
            "radial-gradient(circle at top, #020617, #020617 40%, #020617)",
          color: "#ffffff",
          fontSize: 12,
          padding: "6px 10px 8px",
          boxShadow: "0 -4px 18px rgba(15,23,42,0.9)",
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
        className="timeline-scrollbar"
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
            height: 60,
            width: barWidth,
            overflow: "hidden",
            borderRadius: 6,
            background:
              "linear-gradient(to bottom, #020617, #020617 40%, #020617)",
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

          {/* 確定カウントのマーカー */}
          {confirmedCounts.map((count) => {
            const x = count * pxPerCount;
            return (
              <div
                key={`confirmed-${count}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: x - 1,
                  width: 2,
                  background: "#10b981", // emerald-500
                  pointerEvents: "none",
                  boxShadow: "0 0 4px rgba(16,185,129,0.6)",
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -3,
                    left: -4,
                    width: 0,
                    height: 0,
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderBottom: "6px solid #10b981",
                  }}
                />
              </div>
            );
          })}

          <Playhead
            currentCount={clampCount(currentCount)}
            pxPerCount={pxPerCount}
          />

          {/* small info overlay in the bar */}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 20,
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.7)",
              fontSize: 9,
              color: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ textTransform: "uppercase", opacity: 0.7 }}>
              Range
            </span>
            <span>
              {startSeg?.name ?? "—"}{" "}
              <span style={{ opacity: 0.6, fontSize: 8 }}>
                ({rangeStart})
              </span>
            </span>
            <span style={{ opacity: 0.5 }}>→</span>
            <span>
              {endSeg?.name ?? "—"}{" "}
              <span style={{ opacity: 0.6, fontSize: 8 }}>({rangeEnd})</span>
            </span>
            <span
              style={{
                marginLeft: 6,
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(15,118,110,0.4)",
                fontSize: 8,
              }}
            >
              Now {Math.round(currentCount)}
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

/* ==================== Wrapper ==================== */

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
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[800px] space-y-3">
        {/* Range header (上) */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] px-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-[11px] uppercase tracking-[0.12em] font-semibold">
              Range
            </span>
            <select
              className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900 transition-colors"
              value={playStartId}
              onChange={(e) => onChangePlayStart(e.target.value)}
            >
              {sets.map((s, index) => (
                <option key={`start-${s.id}-${index}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-slate-400 text-[10px]">→</span>
            <select
              className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900 transition-colors"
              value={playEndId}
              onChange={(e) => onChangePlayEnd(e.target.value)}
            >
              {sets.map((s, index) => (
                <option key={`end-${s.id}-${index}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {startSet && endSet && (
            <div className="text-[10px] text-slate-400/80 px-2 py-1 rounded-md bg-slate-800/30 border border-slate-700/40">
              ({startSet.name} {startSet.startCount} → {endSet.name}{" "}
              {endSet.startCount})
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span className="text-slate-400/90 px-2 py-1 rounded-md bg-slate-800/30 border border-slate-700/40">
              Now: <span className="text-slate-200 font-medium">{Math.round(currentCount)}</span> count
            </span>
            <button
              type="button"
              onClick={onAddSetAtCurrent}
              className="rounded-md border border-slate-600/60 bg-slate-800/50 px-2.5 py-1 text-[10px] hover:bg-slate-700/50 hover:border-slate-500/60 text-slate-200 transition-all duration-200"
            >
              + Insert set @ current
            </button>
          </div>
        </div>

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
        confirmedCounts={props.confirmedCounts}
      />
      </div>
    </div>
  );
}
