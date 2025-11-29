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
import Timeline from "@/components/drill/Timeline";

import { useDrillSets } from "@/hooks/useDrillSets";
import { useDrillPlayback } from "@/hooks/useDrillPlayback";
import type { WorldPos } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";
import {
  loadDrillFromLocalStorage,
  autoSaveDrill,
  saveDrillMetadata,
  loadDrillMetadata,
  clearDrillMetadata,
  clearDrillFromLocalStorage,
  clearMembersFromLocalStorage,
} from "@/lib/drill/storage";
import ExportOptionsDialog from "@/components/drill/ExportOptionsDialog";
import MetadataDialog from "@/components/drill/MetadataDialog";
import { useMusicSync } from "@/hooks/useMusicSync";
import MusicSyncPanel from "@/components/drill/MusicSyncPanel";
import CommandPalette, { type Command } from "@/components/drill/CommandPalette";
import { useMenu } from "@/context/MenuContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

// UiSet型はlib/drill/uiTypes.tsからインポートするため、ここでは定義しない

type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

export default function DrillPage() {
  const { t } = useTranslation();
  const { members, setMembers } = useMembers();
  const { settings } = useSettings();
  const { setMenuGroups, setOpenCommandPalette } = useMenu();
  const [isMounted, setIsMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [is3DPreviewOpen, setIs3DPreviewOpen] = useState(false);
  // 一時的な位置（確定前）
  const [pendingPositions, setPendingPositions] = useState<Record<string, WorldPos> | null>(null);
  // ドリルメタデータ（タイトル・データ名）
  const [drillTitle, setDrillTitle] = useState<string>("");
  const [drillDataName, setDrillDataName] = useState<string>("");
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);

  // クライアント側でのみマウントされたことを確認
  useEffect(() => {
    setIsMounted(true);
    
    // メタデータを読み込み
    const metadata = loadDrillMetadata();
    if (metadata) {
      setDrillTitle(metadata.title || "");
      setDrillDataName(metadata.dataName || "");
    }
  }, []);

  // メニューグループを登録（後で定義されるmenuGroupsを使用）

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
    handleChangeNextMove,
    handleChangeSetStartCount,
    handleChangeSetName,
    copySet,
    copySelectedMembers,
    arrangeLineSelected,
    arrangeLineBySelectionOrder,
    reorderSelection,
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

  // 再生テンポ（BPM）の状態管理
  const [playbackBPM, setPlaybackBPM] = useState<number>(120); // デフォルトはBPM=120

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
  } = useDrillPlayback(sets as UiSet[], members as any, playbackBPM);

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
  // 一時的な位置がある場合はそれを優先、なければ通常の位置を使用
  const displayPositions: Record<string, WorldPos> = hasPlayback
    ? playbackPositions
    : pendingPositions || currentSet.positions;

  const activeArc =
    arcBinding && arcBinding.setId === currentSetId ? arcBinding : null;

  // currentCountに基づいて現在のSETを決定
  const getSetForCount = useCallback((count: number): string | null => {
    if (!sets.length) return null;
    
    // SETをstartCountでソート
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    
    // 現在のカウントがどのSETの範囲内にあるかを判定
    for (let i = 0; i < sortedSets.length; i++) {
      const currentSet = sortedSets[i];
      const nextSet = sortedSets[i + 1];
      
      // 最後のSETの場合、または次のSETのstartCountより前の場合
      if (!nextSet || count < nextSet.startCount) {
        return currentSet.id;
      }
    }
    
    // デフォルトは最初のSET
    return sortedSets[0].id;
  }, [sets]);

  // currentCountが変更されたときに、現在のSETを自動的に更新
  useEffect(() => {
    if (hasPlayback) {
      // 再生中の場合のみ、自動的にSETを更新
      const newSetId = getSetForCount(currentCount);
      if (newSetId && newSetId !== currentSetId) {
        setCurrentSetId(newSetId);
      }
    }
  }, [currentCount, hasPlayback, getSetForCount, currentSetId, setCurrentSetId]);

  // 未保存の位置変更がある場合のページ遷移警告
  useEffect(() => {
    if (pendingPositions && !isPlaying) {
      // ページ遷移時の警告
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers require return value
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [pendingPositions, isPlaying]);

  // 現在のSETの範囲を計算
  const getCurrentSetRange = useCallback(() => {
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const currentIndex = sortedSets.findIndex(s => s.id === currentSetId);
    
    if (currentIndex === -1) return { startCount: 0, endCount: undefined };
    
    const currentSet = sortedSets[currentIndex];
    const nextSet = sortedSets[currentIndex + 1];
    
    return {
      startCount: currentSet.startCount,
      endCount: nextSet ? nextSet.startCount : undefined,
    };
  }, [sets, currentSetId]);
  
  const currentSetRange = getCurrentSetRange();

  // すべてのSETで確定されているカウントのリストを取得
  const getConfirmedCounts = useCallback(() => {
    const allConfirmedCounts = new Set<number>();
    
    sets.forEach(set => {
      if (set.positionsByCount) {
        Object.keys(set.positionsByCount).forEach(countStr => {
          allConfirmedCounts.add(Number(countStr));
        });
      }
    });
    
    return Array.from(allConfirmedCounts).sort((a, b) => a - b);
  }, [sets]);

  const confirmedCounts = getConfirmedCounts();

  // 位置確定を解除する関数（すべてのSETから該当カウントを削除）
  const handleRemoveConfirmedPosition = useCallback((count: number) => {
    const updatedSets = sets.map((set) => {
      if (!set.positionsByCount || !set.positionsByCount[count]) return set;
      
      const positionsByCount = { ...set.positionsByCount };
      delete positionsByCount[count];
      
      return {
        ...set,
        positionsByCount: Object.keys(positionsByCount).length > 0 ? positionsByCount : undefined,
      };
    });
    
    restoreState(updatedSets, selectedIds, currentSetId);
  }, [sets, selectedIds, currentSetId, restoreState]);

  // ===== エクスポート機能 =====
  const {
    exportDialogOpen,
    setExportDialogOpen,
    pendingExportType,
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
    setCurrentSetId,
    getSetPositions: (setId: string) => {
      const set = sets.find(s => s.id === setId);
      return set?.positions || {};
    },
  });

  // コマンドパレット用のコマンドリスト
  const commands: Command[] = [
    // ファイル操作
    {
      id: "save",
      label: t("menu.file.save"),
      shortcut: "Ctrl+S",
      icon: "💾",
      group: "file",
      action: handleSave,
    },
    {
      id: "load",
      label: t("menu.file.load"),
      shortcut: "Ctrl+O",
      icon: "📂",
      group: "file",
      action: handleLoad,
    },
    // 編集操作
    {
      id: "undo",
      label: t("menu.edit.undo"),
      shortcut: "Ctrl+Z",
      icon: "↶",
      group: "edit",
      action: undo,
    },
    {
      id: "redo",
      label: t("menu.edit.redo"),
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
      id: "edit-metadata",
      label: "ドリル情報を編集",
      icon: "📝",
      group: "file",
      action: () => setIsMetadataDialogOpen(true),
    },
    {
      id: "reset-all",
      label: t("menu.file.deleteAll"),
      icon: "🗑️",
      group: "file",
      action: () => {
        if (confirm("全てのデータを削除しますか？\nこの操作は取り消せません。\n\n本当に削除してもよろしいですか？")) {
          clearDrillFromLocalStorage();
          clearMembersFromLocalStorage();
          clearDrillMetadata();
          window.location.reload();
        }
      },
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
        { divider: true },
        {
          label: "データを全削除",
          icon: "🗑️",
          action: () => {
            if (confirm("全てのデータを削除しますか？\nこの操作は取り消せません。\n\n本当に削除してもよろしいですか？")) {
              clearDrillFromLocalStorage();
              clearMembersFromLocalStorage();
              clearDrillMetadata();
              window.location.reload();
            }
          },
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

  // コマンドパレットを開くコールバックを設定
  useEffect(() => {
    setOpenCommandPalette(() => setCommandPaletteOpen(true));
    return () => {
      setOpenCommandPalette(() => {});
    };
  }, [setOpenCommandPalette]);

  // メニューグループをレイアウトのメニューバーに登録
  useEffect(() => {
    setMenuGroups(menuGroups);
    return () => {
      // ページから離れるときにメニューをクリア
      setMenuGroups([]);
    };
    // menuGroupsは多くの関数に依存しているため、必要な状態のみを依存配列に含める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMenuGroups, canUndo, canRedo, sets.length]);

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
    // 位置編集時は一時的な位置として保存（確定はしない）
    setPendingPositions((prev) => {
      const basePositions = prev || currentSet.positions;
      const newPositions = { ...basePositions };
      
      // 複数選択時の移動を処理
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        const oldPos = basePositions[id];
        if (oldPos) {
          const dx = pos.x - oldPos.x;
          const dy = pos.y - oldPos.y;
          
          // 選択されているすべてのメンバーを同じ距離だけ移動
          selectedIds.forEach((selId) => {
            const p = basePositions[selId];
            if (p) {
              const moved = clampAndSnap({ x: p.x + dx, y: p.y + dy });
              newPositions[selId] = moved;
            }
          });
        }
      } else {
        // 単一選択時
        newPositions[id] = clampAndSnap(pos);
      }
      
      return newPositions;
    });
  };

  // 位置を確定する関数
  const handleConfirmPositions = useCallback(() => {
    if (!pendingPositions) return;
    
    const currentCountRounded = Math.round(currentCount);
    
    // 現在のカウントでの位置をSETに追加/更新
    const updatedSets = sets.map((set) => {
      if (set.id !== currentSetId) return set;
      
      // positionsByCountを初期化（なければ）
      const positionsByCount = set.positionsByCount || {};
      
      // 現在のカウントでの位置を更新
      const newPositionsByCount = {
        ...positionsByCount,
        [currentCountRounded]: { ...pendingPositions },
      };
      
      return {
        ...set,
        positionsByCount: newPositionsByCount,
      };
    });
    
    // restoreStateを使って状態を更新
    restoreState(updatedSets, selectedIds, currentSetId);
    
    // 一時的な位置をクリア
    setPendingPositions(null);
  }, [pendingPositions, currentCount, currentSetId, sets, selectedIds, restoreState]);

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

      {/* 3Dプレビューモーダル */}
      {is3DPreviewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIs3DPreviewOpen(false)}
        >
          <div
            className="relative w-[90vw] h-[90vh] max-w-[1200px] max-h-[800px] rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-slate-200 uppercase tracking-wider">
                3Dプレビュー
              </h2>
              <div className="flex items-center gap-2">
                {isRecording3D ? (
                  <button
                    onClick={handleStopRecording}
                    className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 border border-red-500/50 shadow-md hover:shadow-lg"
                    title="録画を停止"
                  >
                    録画を停止
                  </button>
                ) : (
                  <button
                    onClick={handleRecord3D}
                    disabled={isRecording2D}
                    className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 border border-red-500/50 shadow-md hover:shadow-lg disabled:shadow-none"
                    title="3D録画（自動的に再生を開始します）"
                  >
                    3D録画
                  </button>
                )}
                <button
                  onClick={() => setIs3DPreviewOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100 transition-all duration-200"
                  title="閉じる"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* 3Dプレビューコンテンツ */}
            <div className="w-full h-[calc(100%-60px)]">
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
          </div>
        </div>
      )}

      {/* エクスポートオプションダイアログ */}
      <ExportOptionsDialog
        isOpen={exportDialogOpen}
        onClose={() => {
          setExportDialogOpen(false);
        }}
        onConfirm={handleExportOptionsConfirm}
        sets={sets}
        allowSetSelection={pendingExportType === "pdf" || pendingExportType === "print"}
      />
      
      {/* メタデータ編集ダイアログ */}
      <MetadataDialog
        isOpen={isMetadataDialogOpen}
        onClose={() => setIsMetadataDialogOpen(false)}
        title={drillTitle}
        dataName={drillDataName}
        onSave={(title, dataName) => {
          setDrillTitle(title);
          setDrillDataName(dataName);
          saveDrillMetadata({ title, dataName });
        }}
      />
      <div className="relative h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
        {/* メインコンテンツエリア（flex、高さ固定） */}
        <div className="flex-1 flex gap-3 overflow-hidden px-3 py-3 max-md:px-1 max-md:py-1">
          {/* 左サイドバー（コマンド系） */}
          <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto sidebar-scrollbar max-md:hidden">
            {/* DrillControls */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 shadow-xl">
              <DrillControls
                sets={sets.map((s) => ({
                  id: s.id,
                  name: s.name,
                  startCount: s.startCount,
                }))}
                currentSetId={currentSetId}
                onChangeCurrentSet={(id) => {
                  if (pendingPositions) {
                    const confirmed = window.confirm(
                      '位置を変更しましたが、まだ保存していません。\n' +
                      'このままSETを変更すると、変更が失われます。\n\n' +
                      'OKを押すと変更を破棄してSETを変更します。\n' +
                      'キャンセルを押すとSET変更を中止します。'
                    );
                    
                    if (!confirmed) {
                      return; // SET変更をキャンセル
                    } else {
                      // 変更を破棄
                      setPendingPositions(null);
                    }
                  }
                  clearPlaybackView();
                  setCurrentSetId(id);
                  handleSelectBulk([]);
                }}
                onAddSet={addSetTail}
                onDeleteSet={deleteSet}
                onReorderSet={reorderSet}
                onChangeSetName={handleChangeSetName}
                onCopySet={copySet}
                onCopySelectedMembers={copySelectedMembers}
                onArrangeLineSelected={arrangeLineSelected}
                onArrangeLineBySelectionOrder={arrangeLineBySelectionOrder}
                onReorderSelection={reorderSelection}
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
                confirmedCounts={confirmedCounts}
                currentCount={hasPlayback ? undefined : currentCount}
                onJumpToCount={(count) => {
                  if (pendingPositions && !isPlaying) {
                    const confirmed = window.confirm(
                      '位置を変更しましたが、まだ保存していません。\n' +
                      'このままカウントを変更すると、変更が失われます。\n\n' +
                      'OKを押すと変更を破棄してカウントを変更します。\n' +
                      'キャンセルを押すとカウント変更を中止します。'
                    );
                    
                    if (!confirmed) {
                      return; // カウント変更をキャンセル
                    } else {
                      // 変更を破棄
                      setPendingPositions(null);
                    }
                  }
                  clearPlaybackView();
                  handleScrub(count);
                }}
              />
            </div>
          </div>

          {/* 中央（フィールド） */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden items-center max-md:gap-1">
              <div className="flex items-center justify-between px-1 w-full max-w-[1400px] max-md:px-2">
              <h2 className="text-base font-semibold text-slate-200 uppercase tracking-wider">
                ドリルエディタ
              </h2>
              <div className="flex items-center gap-2">
                {/* 2D録画ボタン */}
                <button
                  onClick={handleRecord2D}
                  disabled={isRecording2D || isRecording3D}
                  className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 border border-red-500/50 shadow-md hover:shadow-lg disabled:shadow-none"
                  title="2D録画（自動的に再生を開始します）"
                >
                  {isRecording2D ? "録画中..." : "2D録画"}
                </button>
                {/* ズーム */}
                <div className="flex items-center gap-1.5 text-xs">
                <span className="mr-1 text-slate-400/90 text-[10px] uppercase tracking-wider">Zoom</span>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="px-2.5 py-1.5 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 text-slate-300 hover:text-slate-100 transition-all duration-200 shadow-sm"
                >
                  −
                </button>
                <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-md min-w-[60px] text-center text-slate-200 font-medium shadow-inner">
                  {Math.round(canvasScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="px-2 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  ＋
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="ml-1 px-2 py-1 text-[10px] rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Reset
                </button>
              </div>
              {/* ステータス表示 */}
              <div className="flex items-center gap-2 text-xs ml-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60 text-emerald-200">
                  Members: {isMounted ? members.length : 0}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-600 text-slate-300">
                  Count: {isMounted ? Math.round(currentCount) : 0}
                </span>
              </div>
              </div>
            </div>

            {/* フィールドキャンバス */}
            <div className="flex-1 rounded-lg overflow-hidden border border-slate-700/80 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm field-canvas-container min-h-0 shadow-xl w-full max-w-[1400px]">
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
          <div className="w-56 shrink-0 flex flex-col gap-3 overflow-y-auto sidebar-scrollbar max-md:hidden">
            {/* SidePanel */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl overflow-hidden">
              <DrillSidePanel
                members={members as any}
                selectedIds={selectedIds}
                currentSetPositions={displayPositions}
                onAddMember={() => {
                  const newIndex = members.length + 1;
                  const newId = `M${newIndex}`;
                  setMembers((prev) => [
                    ...prev,
                    {
                      id: newId,
                      name: `New Member ${newId}`,
                      part: "Flute",
                      color: "#888888",
                    },
                  ]);
                }}
                onDeleteMember={(id: string) => {
                  setMembers((prev) => prev.filter((m) => m.id !== id));
                }}
                onUpdateMember={(id: string, field: "name" | "part" | "color", value: string) => {
                  setMembers((prev) =>
                    prev.map((m) =>
                      m.id === id
                        ? {
                            ...m,
                            [field]: value,
                          }
                        : m
                    )
                  );
                }}
                onImportMembers={(importedMembers) => {
                  setMembers(() => importedMembers);
                }}
              />
              {/* 位置確定ボタン */}
              {pendingPositions && !hasPlayback && (
                <div className="p-3 border-t border-slate-700/60 bg-slate-800/40">
                  <div className="mb-2 text-xs text-slate-400">
                    位置を編集しました。確定してください。
                  </div>
                  <button
                    onClick={handleConfirmPositions}
                    className="w-full px-4 py-2 text-sm rounded-md bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all duration-200 border border-emerald-500/50 shadow-md hover:shadow-lg font-medium"
                  >
                    ✓ 位置を確定（Count {Math.round(currentCount)}）
                  </button>
                  <button
                    onClick={() => setPendingPositions(null)}
                    className="w-full mt-2 px-3 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}
              {/* 確定カウントのリスト */}
              {confirmedCounts.length > 0 && !hasPlayback && (
                <div className="p-3 border-t border-slate-700/60 bg-slate-800/40">
                  <div className="mb-2 text-xs text-slate-300 font-semibold uppercase tracking-wider">
                    確定済みカウント
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {confirmedCounts.map((count) => (
                      <div
                        key={count}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-500/40"
                      >
                        <span className="text-xs text-emerald-200 font-mono">
                          Count {count}
                        </span>
                        <button
                          onClick={() => handleRemoveConfirmedPosition(count)}
                          className="px-2 py-0.5 text-xs rounded bg-red-600/60 hover:bg-red-600/80 text-white transition-colors"
                          title="確定を解除"
                        >
                          解除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3Dプレビューを開くボタン */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 shadow-xl">
              <button
                onClick={() => setIs3DPreviewOpen(true)}
                className="w-full px-4 py-3 rounded-md bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 border border-blue-500/50 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                title="3Dプレビューを開く"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                3Dプレビューを開く
              </button>
              {isRecording3D && (
                <button
                  onClick={handleStopRecording}
                  className="w-full mt-2 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 border border-red-500/50 shadow-md hover:shadow-lg"
                  title="録画を停止"
                >
                  録画を停止
                </button>
              )}
            </div>

            {/* 音楽同期パネル */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 shadow-xl">
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
                  playbackBPM={playbackBPM}
                  onSetPlaybackBPM={setPlaybackBPM}
                />
            </div>
          </div>
        </div>

        {/* タイムライン（固定、下部） */}
        <div className="flex-shrink-0 border-t border-slate-800/80 bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-sm z-10 px-3 py-3 shadow-2xl max-md:px-1 max-md:py-1">
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
              if (pendingPositions && !isPlaying) {
                const confirmed = window.confirm(
                  '位置を変更しましたが、まだ保存していません。\n' +
                  'このままカウントを変更すると、変更が失われます。\n\n' +
                  'OKを押すと変更を破棄してカウントを変更します。\n' +
                  'キャンセルを押すとカウント変更を中止します。'
                );
                
                if (!confirmed) {
                  return; // カウント変更をキャンセル
                } else {
                  // 変更を破棄
                  setPendingPositions(null);
                }
              }
              clearPlaybackView();
              setCountFromMusic(count);
            }}
            onStartPlay={() => {
              handleStartPlay();
            }}
            onStopPlay={handleStopPlay}
            onAddSetAtCurrent={() => addSetAtCount(currentCount)}
            confirmedCounts={confirmedCounts}
          />
        </div>
      </div>
    </>
  );
}
