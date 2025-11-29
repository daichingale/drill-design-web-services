// app/drill/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMembers } from "@/context/MembersContext";
import { useSettings } from "@/context/SettingsContext";
import { STEP_M } from "@/lib/drill/utils";
import { useSnapMode } from "@/hooks/useSnapMode";
import { useIndividualPlacement } from "@/hooks/useIndividualPlacement";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { useDrillExport } from "@/hooks/useDrillExport";
import { useDrillRecording } from "@/hooks/useDrillRecording";
import { useDrillUndoRedo } from "@/hooks/useDrillUndoRedo";

import FieldCanvas, { type FieldCanvasRef } from "@/components/drill/FieldCanvas";
import DrillControls from "@/components/drill/DrillControls";
import DrillSidePanel from "@/components/drill/DrillSidePanel";
import Drill3DPreview, { type Drill3DPreviewRef } from "@/components/drill/Drill3DPreview";
import NotePanel from "@/components/drill/NotePanel";
import InstructionsPanel from "@/components/drill/InstructionsPanel";
import Timeline from "@/components/drill/Timeline";

import { useDrillSets } from "@/hooks/useDrillSets";
import { useDrillPlayback } from "@/hooks/useDrillPlayback";
import type { WorldPos } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";
import {
  loadDrillFromLocalStorage,
  autoSaveDrill,
} from "@/lib/drill/storage";
import ExportOptionsDialog from "@/components/drill/ExportOptionsDialog";
import { useMusicSync } from "@/hooks/useMusicSync";
import MusicSyncPanel from "@/components/drill/MusicSyncPanel";
import CommandPalette, { type Command } from "@/components/drill/CommandPalette";
import HeaderMenu from "@/components/drill/HeaderMenu";

// UiSet型はlib/drill/uiTypes.tsからインポートするため、ここでは定義しない

type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

export default function DrillPage() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [isMounted, setIsMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // クライアント側でのみマウントされたことを確認
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ===== スナップモード =====
  const { snapMode, setSnapMode, snapWorld } = useSnapMode();
  const clampAndSnap = useCallback(
    (p: WorldPos): WorldPos => {
      return snapWorld(p);
    },
    [snapWorld]
  );

  // セット編集系
  const {
    sets: drillSetsSets,
    currentSet,
    currentSetId: drillCurrentSetId,
    setCurrentSetId: drillSetCurrentSetId,
    selectedIds: drillSelectedIds,
    handleToggleSelect,
    handleMove,
    handleChangeNote,
    handleChangeInstructions,
    handleChangeSetStartCount,
    arrangeLineSelected,
    arcBinding,
    startBezierArc,
    clearBezierArc,
    handleUpdateArcPoint,
    handleMoveArcGroup,
    addSetTail,
    addSetAtCount,
    deleteSet,
    reorderSet,
    handleSelectBulk,
    nudgeSelected,
    restoreState,
    arrangeCircle,
    arrangeRectangle,
    arrangeSpiral,
    arrangeBox,
    rotateSelected,
    scaleSelected,
  } = useDrillSets(members as any, clampAndSnap);

  // 必要に応じて変数名を統一
  const sets = drillSetsSets;
  const currentSetId = drillCurrentSetId;
  const setCurrentSetId = drillSetCurrentSetId;
  const selectedIds = drillSelectedIds;

  // ===== 個別配置モード =====
  const {
    individualPlacementMode,
    placementQueue,
    handleToggleIndividualPlacement,
    handlePlaceMember: handlePlaceMemberBase,
  } = useIndividualPlacement(selectedIds);

  const handlePlaceMember = useCallback(
    (id: string, pos: WorldPos) => {
      handlePlaceMemberBase(id, pos, handleMove);
    },
    [handlePlaceMemberBase, handleMove]
  );

  // ===== Undo/Redo統合 =====
  const { undo, redo, canUndo, canRedo, isRestoringRef } = useDrillUndoRedo({
    sets: drillSetsSets,
    selectedIds: drillSelectedIds,
    currentSetId: drillCurrentSetId,
    restoreState,
    loadDrillFromLocalStorage,
    autoSaveDrill,
  });

  // 再生系
  const {
    currentCount,
    isPlaying,
    playbackPositions,
    handleScrub,
    startPlayBySetId,
    stopPlay,
    clearPlaybackView,
    setRecordingMode,
    setCountFromMusic,
    setMusicSyncMode,
  } = useDrillPlayback(sets as UiSet[], members as any);

  // 再生範囲（開始 / 終了セットの ID）
  const [playStartId, setPlayStartId] = useState<string>("");
  const [playEndId, setPlayEndId] = useState<string>("");

  // セットが変わったら再生範囲を自動調整
  useEffect(() => {
    if (!sets.length) return;

    setPlayStartId((prev) =>
      prev && sets.some((s) => s.id === prev) ? prev : sets[0].id
    );

    setPlayEndId((prev) =>
      prev && sets.some((s) => s.id === prev)
        ? prev
        : sets[sets.length - 1].id
    );
  }, [sets]);

  // FieldCanvasのref
  const canvasRef = useRef<FieldCanvasRef>(null);
  // 3Dプレビューのref
  const preview3DRef = useRef<Drill3DPreviewRef>(null);
  const lastSyncedCountRef = useRef<number | null>(null);

  // 音楽同期
  const {
    state: musicState,
    loadMusic,
    playMusic,
    stopMusic,
    addMarker,
    removeMarker,
    updateMarker,
    getCountFromMusicTime,
    getMusicTimeFromCount,
    setBPM,
    syncCurrentTime,
    seekToCount,
    seekToMusicTime,
  } = useMusicSync();

  // 再生開始（Set ID ベース）
  const handleStartPlay = () => {
    if (!sets.length) return;
    const startSet = sets.find((s) => s.id === playStartId);
    if (!startSet) return;

    // 音楽同期が有効な場合
    if (musicState.isLoaded && musicState.markers.length > 0) {
      // 音楽同期モードを有効化
      setMusicSyncMode(true);
      
      // 音楽は常に0:00から再生
      seekToMusicTime(0);
      playMusic();
      
      // ドリルのカウントを開始位置に設定（音楽は0:00から始まるが、ドリルは開始セットのカウントから）
      setCountFromMusic(startSet.startCount);
    } else {
      // 音楽同期が無効な場合は通常モード
      setMusicSyncMode(false);
    }
    
    // ドリル再生開始
    startPlayBySetId(playStartId, playEndId);
  };

  // ===== ズーム機能 =====
  const {
    canvasScale,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  } = useCanvasZoom(1);

  const hasPlayback = Object.keys(playbackPositions).length > 0;
  const displayPositions: Record<string, WorldPos> = hasPlayback
    ? playbackPositions
    : currentSet.positions;

  const activeArc =
    arcBinding && arcBinding.setId === currentSetId ? arcBinding : null;

  // ===== エクスポート機能 =====
  const {
    exportDialogOpen,
    setExportDialogOpen,
    handleSave,
    handleLoad,
    handleExportJSON,
    handleImportJSON,
    handleExportYAML,
    handleImportYAML,
    handleExportImage,
    handleExportPDF,
    handlePrint,
    handleExportOptionsConfirm,
  } = useDrillExport({
    sets,
    currentSet,
    currentSetId,
    members,
    canvasRef,
    restoreState,
    isRestoringRef,
  });

  // コマンドパレット用のコマンドリスト
  const commands: Command[] = [
    // ファイル操作
    {
      id: "save",
      label: "保存",
      shortcut: "Ctrl+S",
      icon: "💾",
      group: "file",
      action: handleSave,
    },
    {
      id: "load",
      label: "読み込み",
      shortcut: "Ctrl+O",
      icon: "📂",
      group: "file",
      action: handleLoad,
    },
    // 編集操作
    {
      id: "undo",
      label: "元に戻す",
      shortcut: "Ctrl+Z",
      icon: "↶",
      group: "edit",
      action: undo,
    },
    {
      id: "redo",
      label: "やり直す",
      shortcut: "Ctrl+Y",
      icon: "↷",
      group: "edit",
      action: redo,
    },
    // エクスポート
    {
      id: "export-png",
      label: "PNG画像としてエクスポート",
      icon: "🖼️",
      group: "export",
      action: () => handleExportImage("png"),
    },
    {
      id: "export-jpeg",
      label: "JPEG画像としてエクスポート",
      icon: "🖼️",
      group: "export",
      action: () => handleExportImage("jpeg"),
    },
    {
      id: "export-pdf",
      label: "PDFとしてエクスポート",
      icon: "📄",
      group: "export",
      action: () => handleExportPDF(false),
    },
    {
      id: "print",
      label: "印刷",
      shortcut: "Ctrl+P",
      icon: "🖨️",
      group: "export",
      action: handlePrint,
    },
    {
      id: "export-json",
      label: "JSON形式でエクスポート",
      icon: "📦",
      group: "export",
      action: handleExportJSON,
    },
    {
      id: "export-yaml",
      label: "YAML形式でエクスポート",
      icon: "📝",
      group: "export",
      action: handleExportYAML,
    },
    // インポート
    {
      id: "import-json",
      label: "JSON形式からインポート",
      icon: "📦",
      group: "import",
      action: handleImportJSON,
    },
    {
      id: "import-yaml",
      label: "YAML形式からインポート",
      icon: "📝",
      group: "import",
      action: handleImportYAML,
    },
  ];

  // ヘッダーメニュー用のグループ
  const menuGroups = [
    {
      label: "ファイル",
      items: [
        {
          label: "保存",
          icon: "💾",
          shortcut: "Ctrl+S",
          action: handleSave,
        },
        {
          label: "読み込み",
          icon: "📂",
          shortcut: "Ctrl+O",
          action: handleLoad,
        },
        { divider: true },
        {
          label: "JSON形式でエクスポート",
          icon: "📦",
          action: handleExportJSON,
        },
        {
          label: "YAML形式でエクスポート",
          icon: "📝",
          action: handleExportYAML,
        },
        { divider: true },
        {
          label: "JSON形式からインポート",
          icon: "📦",
          action: handleImportJSON,
        },
        {
          label: "YAML形式からインポート",
          icon: "📝",
          action: handleImportYAML,
        },
      ],
    },
    {
      label: "編集",
      items: [
        {
          label: "元に戻す",
          icon: "↶",
          shortcut: "Ctrl+Z",
          action: undo,
          disabled: !canUndo,
        },
        {
          label: "やり直す",
          icon: "↷",
          shortcut: "Ctrl+Y",
          action: redo,
          disabled: !canRedo,
        },
      ],
    },
    {
      label: "エクスポート",
      items: [
        {
          label: "PNG画像",
          icon: "🖼️",
          action: () => handleExportImage("png"),
        },
        {
          label: "JPEG画像",
          icon: "🖼️",
          action: () => handleExportImage("jpeg"),
        },
        {
          label: "PDF",
          icon: "📄",
          action: () => handleExportPDF(false),
        },
        {
          label: "印刷",
          icon: "🖨️",
          shortcut: "Ctrl+P",
          action: handlePrint,
        },
      ],
    },
  ];

  // ===== 録画機能 =====
  const {
    isRecording2D,
    isRecording3D,
    recordingProgress,
    handleRecord2D,
    handleRecord3D,
    handleStopRecording,
  } = useDrillRecording({
    canvasRef,
    preview3DRef,
    currentSet,
    currentSetId,
    sets,
    playStartId,
    playEndId,
    isPlaying,
    musicState,
    setMusicSyncMode,
    setRecordingMode,
    handleStartPlay,
    stopPlay,
  });

  // ドリル再生停止時に音楽も停止
  const handleStopPlay = () => {
    setMusicSyncMode(false);
    stopPlay();
    if (musicState.isPlaying) {
      stopMusic();
    }
  };

  // ★ 再生ビューを抜けてから編集するためのラッパーたち
  const handleToggleSelectWrapped = (id: string, multi: boolean = false) => {
    clearPlaybackView();
    handleToggleSelect(id, multi);
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

  // 音楽とドリルの再生を同期（音楽の時間からカウントを計算）
  useEffect(() => {
    if (!musicState.isLoaded || !musicState.markers.length) return;
    if (!isPlaying) return;
    // 録画中は音楽同期をスキップ（録画は通常速度で行う）
    if (isRecording2D || isRecording3D) return;

    // 音楽の現在時間からカウントを計算
    const count = getCountFromMusicTime(musicState.currentTime);
    if (count !== null && isFinite(count)) {
      // カウントが実際に変わった時だけ更新（無限ループ防止）
      if (lastSyncedCountRef.current === null || Math.abs(lastSyncedCountRef.current - count) > 0.01) {
        setCountFromMusic(count);
        lastSyncedCountRef.current = count;
      }
    }
  }, [musicState.currentTime, musicState.isLoaded, musicState.markers, isPlaying, isRecording2D, isRecording3D, getCountFromMusicTime, setCountFromMusic]);

  // キーボード操作（Undo/Redo + Ctrl+A + 矢印キー）
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

      // Ctrl/Cmd + K : コマンドパレット
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl/Cmd + S : 保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl/Cmd + Z : Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
        return;
      }

      // Ctrl/Cmd + Y または Ctrl/Cmd + Shift + Z : Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
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

      // スペースキーで音楽同期（カウントは自動的に1ずつ増える）
      if (e.key === " " && musicState.isLoaded) {
        e.preventDefault();
        syncCurrentTime(); // カウントを指定しない（自動増加）
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
    canUndo,
    canRedo,
    undo,
    redo,
    handleSave,
    musicState.isLoaded,
    syncCurrentTime,
    currentCount,
  ]);

  return (
    <>
      {/* コマンドパレット */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* エクスポートオプションダイアログ */}
      <ExportOptionsDialog
        isOpen={exportDialogOpen}
        onClose={() => {
          setExportDialogOpen(false);
        }}
        onConfirm={handleExportOptionsConfirm}
      />
      <div className="relative h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
        {/* ヘッダ（固定） */}
        <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900 z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Drill Design Web
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pywareライクなブラウザ版ドリルエディタ
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* メニューバー */}
            <HeaderMenu groups={menuGroups} />

            {/* コマンドパレット起動ボタン */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors flex items-center gap-2"
              title="コマンドパレットを開く (Ctrl+K)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="text-xs">コマンド</span>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-700 rounded">
                ⌘K
              </kbd>
            </button>

            {/* ステータス表示 */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60 text-emerald-200">
                Members: {isMounted ? members.length : 0}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-600 text-slate-300">
                Count: {isMounted ? Math.round(currentCount) : 0}
              </span>
            </div>
          </div>
        </header>

        {/* メインコンテンツエリア（flex、高さ固定） */}
        <div className="flex-1 flex gap-2 overflow-hidden px-2 py-2">
          {/* 左サイドバー（コマンド系） */}
          <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
            {/* Note */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <h2 className="text-xs font-semibold text-slate-300 mb-1">
                Set Note
              </h2>
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <NotePanel
                  note={currentSet.note}
                  onChangeNote={handleChangeNote}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <h2 className="text-xs font-semibold text-slate-300 mb-1">
                Instructions
              </h2>
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <InstructionsPanel
                  instructions={currentSet.instructions}
                  onChangeInstructions={handleChangeInstructions}
                  setName={currentSet.name}
                />
              </div>
            </div>

            {/* DrillControls */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
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
                onDeleteSet={deleteSet}
                onReorderSet={reorderSet}
                onArrangeLineSelected={arrangeLineSelected}
                onStartBezierArc={startBezierArc}
                onClearBezierArc={clearBezierArc}
                bezierActive={!!activeArc}
                onArrangeCircle={arrangeCircle}
                onArrangeRectangle={arrangeRectangle}
                onArrangeSpiral={arrangeSpiral}
                onArrangeBox={arrangeBox}
                onRotateSelected={rotateSelected}
                onScaleSelected={scaleSelected}
                individualPlacementMode={individualPlacementMode}
                onToggleIndividualPlacement={handleToggleIndividualPlacement}
                onChangeSetStartCount={handleChangeSetStartCount}
                snapMode={snapMode}
                onChangeSnapMode={setSnapMode}
              />
            </div>
          </div>

          {/* 中央（フィールド） */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                ドリルエディタ（DrillEngine駆動）
              </h2>
              <div className="flex items-center gap-2">
                {/* 2D録画ボタン */}
                <button
                  onClick={handleRecord2D}
                  disabled={isRecording2D || isRecording3D}
                  className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  title="2D録画（自動的に再生を開始します）"
                >
                  {isRecording2D ? "録画中..." : "2D録画"}
                </button>
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
            </div>

            {/* フィールドキャンバス */}
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 field-canvas-container min-h-0">
                <FieldCanvas
                  ref={canvasRef}
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
                  onRotateSelected={(center, angle) => {
                    if (selectedIds.length >= 2) {
                      rotateSelected(center, angle);
                    }
                  }}
                  individualPlacementMode={individualPlacementMode}
                  onPlaceMember={handlePlaceMember}
                  placementQueue={placementQueue}
                />
            </div>
          </div>

          {/* 右サイドバー */}
          <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
            {/* SidePanel */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <DrillSidePanel
                members={members as any}
                selectedIds={selectedIds}
                currentSetPositions={currentSet.positions}
              />
            </div>

            {/* 3Dプレビュー */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-300">3Dプレビュー</h2>
                {isRecording3D ? (
                  <button
                    onClick={handleStopRecording}
                    className="px-2 py-1 text-xs rounded-md bg-red-700 text-white hover:bg-red-600 transition-colors"
                    title="録画を停止"
                  >
                    停止
                  </button>
                ) : (
                  <button
                    onClick={handleRecord3D}
                    disabled={isRecording2D}
                    className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                    title="3D録画（自動的に再生を開始します）"
                  >
                    3D録画
                  </button>
                )}
              </div>
              <Drill3DPreview
                ref={preview3DRef}
                members={members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  part: m.part,
                  color: m.color,
                }))}
                positions={displayPositions}
              />
            </div>

            {/* 音楽同期パネル */}
            {musicState.isLoaded && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                <MusicSyncPanel
                  isLoaded={musicState.isLoaded}
                  isPlaying={musicState.isPlaying}
                  currentTime={musicState.currentTime}
                  duration={musicState.duration}
                  markers={musicState.markers}
                  bpm={musicState.bpm}
                  onLoadMusic={loadMusic}
                  onPlayMusic={playMusic}
                  onStopMusic={stopMusic}
                  onAddMarker={addMarker}
                  onRemoveMarker={removeMarker}
                  onSetBPM={setBPM}
                  onSyncCurrentTime={syncCurrentTime}
                  currentCount={currentCount}
                />
              </div>
            )}
          </div>
        </div>

        {/* タイムライン（固定、下部） */}
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900 z-10 px-2 py-2">
          <Timeline
            sets={sets.map((s, index) => ({
              id: s.id,
              name: s.name,
              startCount: s.startCount,
              endCount:
                index < sets.length - 1
                  ? sets[index + 1].startCount
                  : s.startCount + 32,
            }))}
            playStartId={playStartId}
            playEndId={playEndId}
            onChangePlayStart={setPlayStartId}
            onChangePlayEnd={setPlayEndId}
            currentCount={currentCount}
            isPlaying={isPlaying}
            onScrub={(count: number) => {
              clearPlaybackView();
              setCountFromMusic(count);
            }}
            onStartPlay={() => {
              handleStartPlay();
            }}
            onStopPlay={handleStopPlay}
            onAddSetAtCurrent={() => addSetAtCount(currentCount)}
          />
        </div>
      </div>
    </>
  );
}
