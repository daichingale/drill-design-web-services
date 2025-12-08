// components/drill/Timeline.tsx
"use client";

import React, { useRef, useEffect } from "react";

type TimelineSet = {
  id: string;
  name: string;
  startCount: number;
  endCount: number;
  hasInstructions?: boolean; // 指示・動き方が入力されているか
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
  onToggleSetAtCount?: (count: number) => void; // ダブルクリックでSETを追加 / 削除
  rangeStartCount: number;
  rangeEndCount: number;
  onChangeRangeStart: (count: number) => void;
  onChangeRangeEnd: (count: number) => void;
  loopRangeEnabled?: boolean;
  onToggleLoopRange?: () => void;
  drillTitle?: string;
  onClickDrillTitle?: () => void;
  playbackBPM?: number; // BPM値
  onSetPlaybackBPM?: (bpm: number) => void; // BPM変更コールバック
  onLoadMusic?: (file: File) => Promise<boolean> | void; // 音楽読み込みコールバック
  isMusicLoaded?: boolean; // 音楽が読み込まれているか
  musicFileName?: string; // 音楽ファイル名
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
  hasSetAtCurrent?: boolean;
  onToggleSetAtCount?: () => void;
  drillTitle?: string;
  onClickDrillTitle?: () => void;
  onLoadMusic?: () => void;
  isMusicLoaded?: boolean;
  musicFileName?: string;
};

const TimelineHeader: React.FC<HeaderProps> = ({
  currentCount,
  totalCounts,
  isPlaying,
  onStartPlay,
  onStopPlay,
  onStepPrev,
  onStepNext,
  hasSetAtCurrent,
  onToggleSetAtCount,
  drillTitle,
  onClickDrillTitle,
  onLoadMusic,
  isMusicLoaded = false,
  musicFileName,
}) => {
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      {/* left: play / stop + drill theme */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isPlaying ? onStopPlay : onStartPlay}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shadow-md ${
            isPlaying
              ? "bg-emerald-800/70 border border-emerald-500 text-emerald-50 hover:bg-emerald-900"
              : "bg-emerald-700/80 border border-emerald-400 text-emerald-50 hover:bg-emerald-600"
          }`}
          title={isPlaying ? "停止" : "再生"}
        >
          {isPlaying ? "■" : "▶"}
        </button>

        {/* Load Music Button */}
        {onLoadMusic && (
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "audio/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file && onLoadMusic) {
                  onLoadMusic(file);
                }
              };
              input.click();
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors border ${
              isMusicLoaded
                ? "bg-slate-700/90 border-emerald-400/90 text-emerald-200"
                : "bg-slate-800/70 border-slate-600/70 text-slate-200 hover:bg-slate-700/80 hover:border-emerald-500/70 hover:text-emerald-300"
            }`}
            title={isMusicLoaded ? musicFileName || "Music loaded" : "Load music file"}
          >
            {isMusicLoaded ? "🎵 Music" : "📁 Load Music"}
          </button>
        )}

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onClickDrillTitle}
            className="text-[11px] font-semibold tracking-wide text-slate-100 hover:text-sky-300 transition-colors text-left line-clamp-1 max-w-[220px]"
            title={drillTitle || "ドリルのテーマを設定"}
          >
            {drillTitle && drillTitle.trim().length > 0
              ? drillTitle
              : "（ドリルのテーマ未設定）"}
          </button>
          <span className="text-[9px] text-slate-500">
            このドリルのテーマ / コンセプト
          </span>
        </div>

        {/* 音楽ファイル名表示 */}
        {isMusicLoaded && musicFileName && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-semibold tracking-wide text-emerald-300 line-clamp-1 max-w-[200px]">
              🎵 {musicFileName}
            </div>
            <span className="text-[9px] text-slate-500">
              Music File
            </span>
          </div>
        )}
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

        {onToggleSetAtCount && (
          hasSetAtCurrent ? (
            <button
              type="button"
              onClick={onToggleSetAtCount}
              className="ml-1 px-2 py-0.5 text-[10px] rounded-full border border-red-500/70 bg-red-900/60 text-red-100 hover:bg-red-800/80 hover:border-red-400/80 uppercase tracking-wider transition-colors"
              title="このカウントの SET マーカーを外す"
            >
              − SET @ NOW
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleSetAtCount}
              className="ml-1 px-2 py-0.5 text-[10px] rounded-full border border-emerald-500/70 bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/80 hover:border-emerald-400/80 uppercase tracking-wider transition-colors"
              title="このカウントに SET マーカーを追加"
            >
              ＋ SET @ NOW
            </button>
          )
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
        const hasInstructions = s.hasInstructions !== false; // デフォルトはtrue（後方互換性）

        // 指示が未入力の場合のスタイル
        const missingInstructionsStyle = !hasInstructions
          ? {
              background: `
                repeating-linear-gradient(
                  45deg,
                  rgba(239, 68, 68, 0.15),
                  rgba(239, 68, 68, 0.15) 8px,
                  rgba(220, 38, 38, 0.1) 8px,
                  rgba(220, 38, 38, 0.1) 16px
                ),
                linear-gradient(to right, rgba(30, 20, 20, 0.9), rgba(30, 20, 20, 0.95))
              `,
              borderRight: "1px dashed rgba(239, 68, 68, 0.5)",
              boxShadow: "inset 0 0 10px rgba(239, 68, 68, 0.1)",
            }
          : {};

        return (
          <div
            key={`segment-${s.id}-${index}`}
            style={{
              width: widthPx,
              height: "100%",
              borderRight: hasInstructions ? "1px solid #374151" : "1px dashed rgba(239, 68, 68, 0.5)",
              position: "relative",
              background: hasInstructions
                ? "linear-gradient(to right, rgba(15,23,42,0.9), rgba(15,23,42,0.95))"
                : `
                  repeating-linear-gradient(
                    45deg,
                    rgba(239, 68, 68, 0.15),
                    rgba(239, 68, 68, 0.15) 8px,
                    rgba(220, 38, 38, 0.1) 8px,
                    rgba(220, 38, 38, 0.1) 16px
                  ),
                  linear-gradient(to right, rgba(30, 20, 20, 0.9), rgba(30, 20, 20, 0.95))
                `,
              boxSizing: "border-box",
              boxShadow: !hasInstructions ? "inset 0 0 10px rgba(239, 68, 68, 0.1)" : "none",
            }}
          >
            {/* Set name（名前が空なら非表示） */}
            {s.name && (
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
                {s.name}
              </span>
            )}

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
            
            {/* 指示未入力の警告アイコン */}
            {!hasInstructions && (
              <span
                style={{
                  position: "absolute",
                  right: isEnd ? 40 : 6,
                  top: 3,
                  fontSize: 10,
                  color: "#f87171",
                  textShadow: "0 0 4px rgba(239, 68, 68, 0.8)",
                  zIndex: 10,
                }}
                title="指示・動き方が未入力です"
              >
                ⚠️
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
        top: 20,
        bottom: 24, // 上下にマージンを取り、細い帯にする
        left,
        width,
        background:
          "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(147,51,234,0.45))", // 青〜紫系でSETマーカーと差別化
        borderRadius: 4,
        boxShadow: "0 0 6px rgba(191,219,254,0.8)",
        pointerEvents: "none",
      }}
    />
  );
};

type PlayheadProps = {
  currentCount: number;
  pxPerCount: number;
  totalCounts: number;
};

const Playhead: React.FC<PlayheadProps> = ({
  currentCount,
  pxPerCount,
  totalCounts,
}) => {
  const x = currentCount * pxPerCount;
  const rounded = Math.round(currentCount);

  const totalWidthPx = totalCounts * pxPerCount;
  // ラベルは基本的に線の右側に出しつつ、タイムライン枠からはみ出さないようにクランプ
  const labelWidthPx = 28; // おおよそのラベル幅
  const minLeft = -2; // 左にはみ出し許容量（少しだけオーバーラップOK）
  const maxLeft =
    totalWidthPx > labelWidthPx ? totalWidthPx - labelWidthPx : minLeft;

  let labelOffsetX = 4; // デフォルトは線の少し右
  const desiredLeft = x + labelOffsetX;

  if (desiredLeft < minLeft) {
    labelOffsetX = minLeft - x;
  } else if (desiredLeft > maxLeft) {
    labelOffsetX = maxLeft - x;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: x,
        pointerEvents: "none",
      }}
    >
      {/* 本体バー */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 2,
          background: "#f9fafb",
          boxShadow: "0 0 4px rgba(248,250,252,0.8)",
        }}
      />
      {/* 上の小さな三角 */}
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
      {/* 下に現在カウントのラベル */}
      <div
        style={{
          position: "absolute",
          bottom: 2, // タイムライン内に完全に収まるように上方向へ
          left: labelOffsetX,
          padding: "1px 4px",
          minWidth: 24,
          borderRadius: 6,
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(148,163,184,0.9)",
          color: "#e5e7eb",
          fontSize: 9,
          textAlign: "center",
          boxShadow: "0 0 6px rgba(15,23,42,0.9)",
        }}
      >
        {rounded}
      </div>
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
  onToggleSetAtCount?: (count: number) => void;
  rangeStartCount: number;
  rangeEndCount: number;
  onChangeRangeStart: (count: number) => void;
  onChangeRangeEnd: (count: number) => void;
  drillTitle?: string;
  onClickDrillTitle?: () => void;
  playbackBPM?: number; // BPM値
  onSetPlaybackBPM?: (bpm: number) => void; // BPM変更コールバック
  onLoadMusic?: (file: File) => Promise<boolean> | void; // 音楽読み込みコールバック
  isMusicLoaded?: boolean; // 音楽が読み込まれているか
  musicFileName?: string; // 音楽ファイル名
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
  onToggleSetAtCount,
  rangeStartCount,
  rangeEndCount,
  onChangeRangeStart,
  onChangeRangeEnd,
  drillTitle,
  onClickDrillTitle,
  playbackBPM = 120,
  onSetPlaybackBPM,
  onLoadMusic,
  isMusicLoaded = false,
  musicFileName,
}) => {
  // SETが0件でも、タイムライン自体は表示し続ける
  const segments = [...sets].sort((a, b) => a.startCount - b.startCount);

  const inferredMax =
    segments.reduce((max, s) => Math.max(max, s.endCount), 0) || 0;
  // デフォルトの最大カウントは 8*64 = 512 とし、SETが増えればそれ以上にも自動で伸びる
  const totalCounts = Math.max(512, inferredMax || 1);

  const startSeg = segments.find((s) => s.id === playStartId);
  const endSeg = segments.find((s) => s.id === playEndId);

  const rangeStart = Math.max(0, Math.min(rangeStartCount, rangeEndCount));
  const rangeEnd = Math.max(rangeStart + 1, rangeEndCount);
  // 現在カウント（整数化したもの）が、このタイムライン内の「SET（=segments）」
  // もしくは「確定カウント（confirmedCounts）」として存在するかどうか
  const roundedCurrent = Math.round(currentCount);
  const hasSetAtCurrent =
    confirmedCounts.some((c) => Math.round(c) === roundedCurrent) ||
    segments.some((s) => Math.round(s.startCount) === roundedCurrent);

  const barRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  // RANGE はハンドルのみドラッグ可能（バー全体ドラッグはオフ）
  const rangeDragRef = useRef<"start" | "end" | null>(null);

  const pxPerCount = 4;
  const barWidth = Math.max(800, totalCounts * pxPerCount);

  const clampCount = (c: number) => Math.min(Math.max(c, 0), totalCounts);

  const scrubAtClientX = (
    clientX: number,
    extra?: (count: number) => void
  ) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const count = Math.round(x / pxPerCount);
    const clamped = clampCount(count);
    onScrub(clamped);
    if (extra) extra(clamped);
  };

  const autoScrollIfNeeded = (clientX: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const edge = 32; // 端から何px以内でオートスクロールを開始するか
    const speed = 24; // 1イベントあたりのスクロール量(px)

    if (clientX > rect.right - edge) {
      scrollRef.current.scrollLeft += speed;
    } else if (clientX < rect.left + edge) {
      scrollRef.current.scrollLeft -= speed;
    }
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
    // ドラッグ中のみオートスクロールを有効化
    if (isDraggingRef.current || rangeDragRef.current) {
      autoScrollIfNeeded(e.clientX);
    }

    // RANGE ハンドルをドラッグ中
    if (rangeDragRef.current && barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const count = clampCount(Math.round(x / pxPerCount));

      if (rangeDragRef.current === "start") {
        // 開始ハンドル側は、親コンポーネント側で
        // 「開始値と終了値が入れ替わる」ロジックを持つため、
        // ここではそのまま通知する
        onChangeRangeStart(count);
      } else if (rangeDragRef.current === "end") {
        onChangeRangeEnd(count);
      }
      return;
    }

    // 通常のスクラブ
    if (!isDraggingRef.current) return;
    scrubAtClientX(e.clientX);
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
    rangeDragRef.current = null;
  };

  // マウスがタイムライン外で離された場合でもドラッグ状態を終了させる
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (isDraggingRef.current || rangeDragRef.current) {
        stopDragging();
      }
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  const isLoopRangeActive = rangeEndCount > rangeStartCount;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const key = e.key;
    const isCtrl = e.ctrlKey || e.metaKey;

    // Space: 再生 / 停止トグル
    if (key === " ") {
      e.preventDefault();
      if (isPlaying) {
        onStopPlay();
      } else {
        onStartPlay();
      }
      return;
    }

    if (key !== "ArrowLeft" && key !== "ArrowRight") return;

    e.preventDefault();

    const roundedCurrent = Math.round(currentCount);

    // 単純に1カウントずつ移動
    if (!isCtrl) {
      const delta = key === "ArrowLeft" ? -1 : 1;
      const next = Math.max(0, roundedCurrent + delta);
      onScrub(next);
      return;
    }

    // Ctrl + ← / → で SETマーカー位置へジャンプ
    const markerCounts =
      confirmedCounts.length > 0
        ? [...confirmedCounts].sort((a, b) => a - b)
        : Array.from(new Set(sets.map((s) => Math.round(s.startCount)))).sort(
            (a, b) => a - b
          );

    if (markerCounts.length === 0) return;

    if (key === "ArrowLeft") {
      const prev = markerCounts.filter((c) => c < roundedCurrent).pop();
      onScrub(prev ?? markerCounts[0]);
    } else if (key === "ArrowRight") {
      const next = markerCounts.find((c) => c > roundedCurrent);
      onScrub(next ?? markerCounts[markerCounts.length - 1]);
    }
  };

  return (
    <div
      className="w-full flex justify-center"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
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
          position: "relative", // 右上固定オーバーレイの基準
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
          hasSetAtCurrent={hasSetAtCurrent}
          onToggleSetAtCount={
            onToggleSetAtCount
              ? () => onToggleSetAtCount(Math.round(currentCount))
              : undefined
          }
          drillTitle={drillTitle}
          onClickDrillTitle={onClickDrillTitle}
          onLoadMusic={onLoadMusic}
          isMusicLoaded={isMusicLoaded}
          musicFileName={musicFileName}
        />

        <div
          className="timeline-scrollbar"
          style={{
            width: "100%",
            overflowX: "auto",
            overflowY: "hidden",
          }}
          ref={scrollRef}
        >
          <div
            ref={barRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onDoubleClick={(e) => {
              scrubAtClientX(e.clientX, (c) => {
                if (onToggleSetAtCount) onToggleSetAtCount(c);
              });
            }}
            style={{
              position: "relative",
              height: 72,
              width: barWidth,
              overflow: "visible",
              borderRadius: 6,
              background:
                "linear-gradient(to bottom, #020617, #020617 40%, #020617)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <TimelineRuler totalCounts={totalCounts} pxPerCount={pxPerCount} />

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
                    background: "#10b981",
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

            {/* RANGE バー */}
            <PlayRangeOverlay
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pxPerCount={pxPerCount}
            />

            {/* RANGE ハンドル */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: rangeStart * pxPerCount,
                width: Math.max((rangeEnd - rangeStart) * pxPerCount, 0),
                height: "100%",
                pointerEvents: "none",
              }}
            >
              {(() => {
                // 範囲が非常に小さい（被っている）場合は、ハンドルを左右にずらす
                const rangeWidth = (rangeEnd - rangeStart) * pxPerCount;
                const isOverlapping = rangeWidth < 16; // 16px未満の場合は被っていると判断
                const startOffset = isOverlapping ? -6 : 0; // 開始位置は左にずらす
                const endOffset = isOverlapping ? -6 : 0; // 終了位置は右にずらす（right: -6で右に出す）
                
                return (
                  <>
                    {/* 左ハンドル（開始位置・上に配置・青） */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  rangeDragRef.current = "start";
                }}
                style={{
                  position: "absolute",
                        left: startOffset,
                        top: -8,
                        width: 12,
                        height: 14,
                  background:
                          "linear-gradient(to bottom, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
                  borderRadius: 3,
                        border: "1px solid rgba(59,130,246,1)",
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                        boxShadow: "0 0 4px rgba(59,130,246,0.6)",
                        zIndex: 10,
                }}
                      title="範囲開始位置"
              />
                    {/* 右ハンドル（終了位置・下に配置・紫） */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  rangeDragRef.current = "end";
                }}
                style={{
                  position: "absolute",
                        right: endOffset,
                        top: -2,
                        width: 12,
                        height: 14,
                  background:
                          "linear-gradient(to bottom, rgba(147,51,234,0.95), rgba(126,34,206,0.95))",
                  borderRadius: 3,
                        border: "1px solid rgba(147,51,234,1)",
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                        boxShadow: "0 0 4px rgba(147,51,234,0.6)",
                        zIndex: 10,
                }}
                      title="範囲終了位置"
              />
                  </>
                );
              })()}
            </div>

            <Playhead
              currentCount={clampCount(currentCount)}
              pxPerCount={pxPerCount}
              totalCounts={totalCounts}
            />
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
    confirmedCounts = [],
    onToggleSetAtCount,
    rangeStartCount,
    rangeEndCount,
    onChangeRangeStart,
    onChangeRangeEnd,
    loopRangeEnabled = false,
    onToggleLoopRange,
    drillTitle,
    onClickDrillTitle,
    playbackBPM = 120,
    onSetPlaybackBPM,
    onLoadMusic,
    isMusicLoaded = false,
    musicFileName,
  } = props;

  const startSet = sets.find((s) => s.id === playStartId);
  const endSet = sets.find((s) => s.id === playEndId);

  const hasSetAtCurrent = sets.some(
    (s) => Math.round(s.startCount) === Math.round(currentCount)
  );

  // Range を「SET名」ではなく「カウント」ベースで扱う
  const rangeCountOptions =
    confirmedCounts.length > 0
      ? [...confirmedCounts].sort((a, b) => a - b)
      : Array.from(new Set(sets.map((s) => s.startCount))).sort((a, b) => a - b);

  const startCountValue =
    startSet?.startCount ?? rangeCountOptions[0] ?? 0;
  const endCountValue =
    endSet?.startCount ?? rangeCountOptions[rangeCountOptions.length - 1] ?? startCountValue;

  const findSegmentIdForCount = (count: number): string | null => {
    if (!sets.length) return null;
    // カウントが含まれるセグメントを探す
    const byStart = [...sets].sort((a, b) => a.startCount - b.startCount);
    const seg = byStart.find((s, idx) => {
      const end =
        idx < byStart.length - 1 ? byStart[idx + 1].startCount : s.startCount + 32;
      return count >= s.startCount && count < end;
    });
    if (seg) return seg.id;
    // 見つからなければ startCount が一番近いもの
    let best = byStart[0];
    let bestDiff = Math.abs(byStart[0].startCount - count);
    for (let i = 1; i < byStart.length; i++) {
      const d = Math.abs(byStart[i].startCount - count);
      if (d < bestDiff) {
        bestDiff = d;
        best = byStart[i];
      }
    }
    return best.id;
  };

  // totalCountsを計算（BaseTimelineと同じロジック）
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const inferredMax = sortedSets.reduce((max, s) => Math.max(max, s.endCount), 0) || 0;
  const totalCounts = Math.max(512, inferredMax || 1);

  // Loop RangeボタンのON/OFF状態（デフォルトOFF）
  const isLoopRangeActive = !!loopRangeEnabled;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[800px] space-y-3">
        {/* Range header (上) */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] px-2">
          {/* 左側: LOOP RANGE コントロール（DAW風） */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition-colors border ${
                isLoopRangeActive
                  ? "bg-slate-700/90 border-emerald-400/90 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                  : "bg-slate-800/70 border-slate-600/70 text-slate-200 hover:bg-slate-700/80 hover:border-emerald-500/70 hover:text-emerald-300"
              }`}
              onClick={() => {
                if (onToggleLoopRange) {
                  onToggleLoopRange();
                }
              }}
              onDoubleClick={() => {
                // Range リセット：全体を対象に
                onChangeRangeStart(0);
                onChangeRangeEnd(totalCounts);
              }}
              title="ダブルクリックで全体範囲にリセット"
            >
              <span className="text-[9px]">{isLoopRangeActive ? "⟳" : "◯"}</span>
              <span>{isLoopRangeActive ? "LOOP RANGE ON" : "LOOP RANGE OFF"}</span>
            </button>

            {/* Start / End の小さなパネル */}
            <div className="flex items-center gap-1 rounded-full bg-slate-900/80 border border-slate-700/80 px-2 py-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500">Start</span>
                <input
                  type="number"
                  className="w-14 rounded bg-slate-950 border border-slate-600/80 px-1 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/70 hover:bg-slate-900 transition-colors"
                  value={Math.round(rangeStartCount)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChangeRangeStart(isNaN(v) ? 0 : v);
                  }}
                />
              </div>
              <span className="text-slate-500 text-[10px] px-1">→</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500">End</span>
                <input
                  type="number"
                  className="w-14 rounded bg-slate-950 border border-slate-600/80 px-1 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/70 hover:bg-slate-900 transition-colors"
                  value={Math.round(rangeEndCount)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChangeRangeEnd(isNaN(v) ? 0 : v);
                  }}
                />
              </div>
            </div>

            {/* BPM表示（DAW風） */}
            <div className="flex items-center gap-1 rounded-full bg-slate-900/80 border border-slate-700/80 px-2 py-0.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">BPM</span>
              {onSetPlaybackBPM ? (
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="1"
                  className="w-12 rounded bg-slate-950 border border-slate-600/80 px-1 py-0.5 text-[11px] text-emerald-300 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/70 hover:bg-slate-900 transition-colors text-center"
                  value={Math.round(playbackBPM)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= 300) {
                      onSetPlaybackBPM(v);
                    }
                  }}
                  title="BPMを変更（1-300）"
                />
              ) : (
                <span className="text-[11px] text-emerald-300 font-semibold px-1">
                  {Math.round(playbackBPM)}
                </span>
              )}
            </div>

            {/* セット or カウント情報のサマリ */}
            {sets.length === 0 ? (
              <div className="text-[10px] text-slate-400/80 px-2 py-1 rounded-md bg-slate-800/40 border border-slate-700/60">
                Count{" "}
                <span className="text-slate-200 font-medium">
                  {Math.round(rangeStartCount)}
                </span>{" "}
                →{" "}
                <span className="text-slate-200 font-medium">
                  {Math.round(rangeEndCount)}
                </span>{" "}
                <span className="text-slate-500">(SETなし・カウントのみ)</span>
              </div>
            ) : (
              startSet &&
              endSet && (
                <div className="text-[10px] text-slate-400/80 px-2 py-1 rounded-md bg-slate-800/40 border border-slate-700/60">
                  Count{" "}
                  <span className="text-slate-200 font-medium">
                    {startCountValue}
                  </span>{" "}
                  →{" "}
                  <span className="text-slate-200 font-medium">
                    {endCountValue}
                  </span>
                </div>
              )
            )}
          </div>

          {/* 右側: 現在カウント表示 */}
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span className="text-slate-400/90 px-2 py-1 rounded-md bg-slate-800/40 border border-slate-700/60">
              Now{" "}
              <span className="text-slate-200 font-medium">
                {Math.round(currentCount)}
              </span>{" "}
              count
            </span>
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
          confirmedCounts={confirmedCounts}
          onToggleSetAtCount={onToggleSetAtCount}
          rangeStartCount={rangeStartCount}
          rangeEndCount={rangeEndCount}
          onChangeRangeStart={onChangeRangeStart}
          onChangeRangeEnd={onChangeRangeEnd}
          drillTitle={drillTitle}
          onClickDrillTitle={onClickDrillTitle}
          playbackBPM={playbackBPM}
          onSetPlaybackBPM={onSetPlaybackBPM}
          onLoadMusic={onLoadMusic}
          isMusicLoaded={isMusicLoaded}
          musicFileName={musicFileName}
        />
      </div>
    </div>
  );
}
