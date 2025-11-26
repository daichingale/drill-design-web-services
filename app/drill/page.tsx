// app/drill/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useMembers } from "@/context/MembersContext";
import { FIELD_WIDTH_M, FIELD_HEIGHT_M, STEP_M } from "@/lib/drill/utils";

import FieldCanvas from "@/components/drill/FieldCanvas";
import DrillControls from "@/components/drill/DrillControls";
import DrillSidePanel from "@/components/drill/DrillSidePanel";
import Drill3DPreview from "@/components/drill/Drill3DPreview";
import NotePanel from "@/components/drill/NotePanel";
import Timeline from "@/components/drill/Timeline";

import { useDrillSets } from "@/hooks/useDrillSets";
import { useDrillPlayback } from "@/hooks/useDrillPlayback";
import type { WorldPos } from "@/lib/drill/types";

type UiSet = {
  id: string;
  name: string;
  startCount: number;
  positions: Record<string, WorldPos>;
  note: string;
};

// スナップモード
type SnapMode = "whole" | "half" | "free";

export default function DrillPage() {
  const { members } = useMembers();

  // ===== スナップモード（ホール / ハーフ / 自由）=====
  const [snapMode, setSnapMode] = useState<SnapMode>("whole");

  // スナップ処理
  const snapWorld = (p: WorldPos): WorldPos => {
    if (snapMode === "free") return p;

    const division = snapMode === "whole" ? 1 : 2;
    const step = STEP_M / division;

    const sx = Math.round(p.x / step) * step;
    const sy = Math.round(p.y / step) * step;

    return { x: sx, y: sy };
  };

  const clampPos = (p: WorldPos): WorldPos => ({
    x: Math.min(Math.max(p.x, 0), FIELD_WIDTH_M),
    y: Math.min(Math.max(p.y, 0), FIELD_HEIGHT_M),
  });

  const clampAndSnap = useCallback(
    (p: WorldPos): WorldPos => {
      return clampPos(snapWorld(p));
    },
    [snapMode]
  );

  // セット編集系
  const {
    sets,
    currentSet,
    currentSetId,
    setCurrentSetId,
    selectedIds,
    handleToggleSelect,
    handleMove,
    handleChangeNote,
    handleChangeSetStartCount,
    arrangeLineSelected,
    arcBinding,
    startBezierArc,
    clearBezierArc,
    handleUpdateArcPoint,
    handleMoveArcGroup,
    addSetTail,
    addSetAtCount,
    handleSelectBulk,
    nudgeSelected,
  } = useDrillSets(members as any, clampAndSnap);

  // 再生系
  const {
    currentCount,
    isPlaying,
    playbackPositions,
    handleScrub,
    startPlayBySetId,
    stopPlay,
    clearPlaybackView,
  } = useDrillPlayback(sets as UiSet[], members as any);

  // 再生範囲（開始 / 終了セットの ID）
  const [playStartId, setPlayStartId] = useState<string>("");
  const [playEndId, setPlayEndId] = useState<string>("");

  useEffect(() => {
    if (!sets.length) return;

    setPlayStartId((prev) =>
      prev && sets.some((s) => s.id === prev) ? prev : sets[0].id
    );

    setPlayEndId((prev) =>
      prev && sets.some((s) => s.id === prev) ? prev : sets[sets.length - 1].id
    );
  }, [sets]);

  // 再生開始（Set ID ベース）
  const handleStartPlay = () => {
    if (!sets.length) return;
    startPlayBySetId(playStartId, playEndId);
  };

  // ★ 再生ビューを抜けてから編集するためのラッパーたち
  const handleToggleSelectWrapped = (id: string) => {
    clearPlaybackView();
    handleToggleSelect(id);
  };

  const handleMoveWrapped = (id: string, pos: WorldPos) => {
    clearPlaybackView();
    handleMove(id, pos);
  };

  const handleSelectBulkWrapped = (ids: string[]) => {
    clearPlaybackView();
    handleSelectBulk(ids);
  };

  const nudgeSelectedWrapped = (dx: number, dy: number) => {
    clearPlaybackView();
    nudgeSelected(dx, dy);
  };

  // ズーム（FieldCanvas 用）
  const [canvasScale, setCanvasScale] = useState(1);
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.5;

  const handleZoomIn = () =>
    setCanvasScale((prev) => Math.min(prev * 1.2, MAX_SCALE));
  const handleZoomOut = () =>
    setCanvasScale((prev) => Math.max(prev / 1.2, MIN_SCALE));
  const handleZoomReset = () => setCanvasScale(1);

  const hasPlayback = Object.keys(playbackPositions).length > 0;
  const displayPositions: Record<string, WorldPos> = hasPlayback
    ? playbackPositions
    : currentSet.positions;

  const activeArc =
    arcBinding && arcBinding.setId === currentSetId ? arcBinding : null;

  // キーボード操作（Ctrl+A 全選択 ＋ 矢印キーで微調整）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl / Cmd + A : 全選択
      const isSelectAllKey =
        (e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey);

      if (isSelectAllKey) {
        e.preventDefault();

        if (!members.length) return;

        const allIds = members.map((m) => m.id);
        handleSelectBulkWrapped(allIds);
        return;
      }

      // 矢印キーで微調整
      if (isPlaying) return;
      if (!selectedIds.length) return;

      const key = e.key;
      if (
        key !== "ArrowUp" &&
        key !== "ArrowDown" &&
        key !== "ArrowLeft" &&
        key !== "ArrowRight"
      ) {
        return;
      }

      const division =
        snapMode === "whole" ? 1 : snapMode === "half" ? 2 : 4;
      const baseStep = STEP_M / division;
      const factor = e.shiftKey ? 4 : 1;
      const step = baseStep * factor;

      let dx = 0;
      let dy = 0;

      if (key === "ArrowUp") dy = -step;
      if (key === "ArrowDown") dy = step;
      if (key === "ArrowLeft") dx = -step;
      if (key === "ArrowRight") dx = step;

      if (dx === 0 && dy === 0) return;

      e.preventDefault();
      nudgeSelectedWrapped(dx, dy);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    snapMode,
    selectedIds,
    isPlaying,
    members,
    handleSelectBulkWrapped,
    nudgeSelectedWrapped,
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* ヘッダ */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Drill Design Web
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pywareライクなブラウザ版ドリルエディタ
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60">
              Members: {members.length}
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-900/60 border border-slate-600">
              Count: {Math.round(currentCount)}
            </span>
          </div>
        </header>

        {/* Note + エディタ + SidePanel */}
        <section className="flex gap-4">
          {/* Note */}
          <div className="w-64 shrink-0 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <h2 className="text-xs font-semibold text-slate-300 mb-1">
              Set Note
            </h2>
            <p className="text-[10px] text-slate-500 mb-2">
              このセット特有のメモを書いておく欄です。
            </p>
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <NotePanel
                note={currentSet.note}
                onChangeNote={handleChangeNote}
              />
            </div>
          </div>

          {/* 中央 */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                ドリルエディタ（DrillEngine駆動）
              </h2>
              {/* ズーム */}
              <div className="flex items-center gap-1 text-xs">
                <span className="mr-1 text-slate-400">Zoom</span>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="px-2 py-1 border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 transition"
                >
                  −
                </button>
                <span className="px-2 py-1 bg-slate-900 rounded-md border border-slate-700 min-w-[52px] text-center">
                  {Math.round(canvasScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="px-2 py-1 border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 transition"
                >
                  ＋
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="ml-1 px-2 py-1 text-[10px] border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
              <DrillControls
                sets={sets.map((s) => ({
                  id: s.id,
                  name: s.name,
                  startCount: s.startCount,
                }))}
                currentSetId={currentSetId}
                onChangeCurrentSet={(id) => {
                  clearPlaybackView();
                  setCurrentSetId(id);
                  handleSelectBulk([]);
                }}
                onAddSet={addSetTail}
                onArrangeLineSelected={arrangeLineSelected}
                onStartBezierArc={startBezierArc}
                onClearBezierArc={clearBezierArc}
                bezierActive={!!activeArc}
                onChangeSetStartCount={handleChangeSetStartCount}
                snapMode={snapMode}
                onChangeSnapMode={setSnapMode}
              />

              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                <FieldCanvas
                  members={members as any}
                  displayPositions={displayPositions}
                  currentSetPositions={currentSet.positions}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelectWrapped}
                  isPlaying={isPlaying}
                  activeArc={activeArc}
                  onMoveMember={handleMoveWrapped}
                  onUpdateArcPoint={handleUpdateArcPoint}
                  onMoveArcGroup={handleMoveArcGroup}
                  scale={canvasScale}
                  onRectSelect={handleSelectBulkWrapped}
                  clampAndSnap={clampAndSnap}
                />
              </div>
            </div>
          </div>

          {/* 右パネル */}
          <div className="w-64 shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 p-3">
            <h2 className="text-xs font-semibold text-slate-300 mb-2">
              メンバー情報
            </h2>
            <DrillSidePanel
              members={members as any}
              selectedIds={selectedIds}
              currentSetPositions={currentSet.positions}
            />
          </div>
        </section>

        {/* タイムライン */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
          <Timeline
            sets={sets.map((s, index) => ({
              id: s.id,
              name: s.name,
              startCount: s.startCount,
              endCount:
                index < sets.length - 1
                  ? sets[index + 1].startCount
                  : s.startCount + 16,
            }))}
            playStartId={playStartId}
            playEndId={playEndId}
            onChangePlayStart={setPlayStartId}
            onChangePlayEnd={setPlayEndId}
            currentCount={currentCount}
            isPlaying={isPlaying}
            onScrub={handleScrub}
            onStartPlay={handleStartPlay}
            onStopPlay={stopPlay}
            onAddSetAtCurrent={() => addSetAtCount(currentCount)}
          />
        </section>

        {/* 3D プレビュー */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 w-[340px]">
          <h2 className="text-xs font-semibold text-slate-300 mb-2">
            3Dプレビュー
          </h2>
          <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <Drill3DPreview
              members={members as any}
              positions={displayPositions}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
