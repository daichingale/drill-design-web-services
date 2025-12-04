// app/drill/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import type { Member } from "@/context/MembersContext";
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
import StatisticsPanel from "@/components/drill/StatisticsPanel";
// import VideoConverterPanel from "@/components/drill/VideoConverterPanel"; // 一時的に非表示
import CommandPalette, { type Command } from "@/components/drill/CommandPalette";
import SaveStatusIndicator from "@/components/drill/SaveStatusIndicator";
import FileDropZone from "@/components/drill/FileDropZone";
import SearchFilterPanel from "@/components/drill/SearchFilterPanel";
import { useMenu } from "@/context/MenuContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useClipboard } from "@/context/ClipboardContext";
import { useKeyboardShortcuts, type ShortcutDefinition } from "@/hooks/useKeyboardShortcuts";
import ShortcutHelpDialog from "@/components/ShortcutHelpDialog";
import EditorHelpDialog from "@/components/EditorHelpDialog";
import { addGlobalNotification } from "@/components/ErrorNotification";
import { useShortcuts } from "@/context/ShortcutContext";

// UiSet型はlib/drill/uiTypes.tsからインポートするため、ここでは定義しない

type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

type LineEditState = {
  memberIds: string[];
  start: WorldPos;
  end: WorldPos;
} | null;

type BoxEditState = {
  memberIds: string[];
  cols: number;
  rows: number;
  // 四隅のワールド座標
  tl: WorldPos; // top-left
  tr: WorldPos; // top-right
  br: WorldPos; // bottom-right
  bl: WorldPos; // bottom-left
} | null;

export default function DrillPage() {
  const { t } = useTranslation();
  const { members, setMembers } = useMembers();
  const { settings, updateSettings } = useSettings();
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
  const [drillDbId, setDrillDbId] = useState<string | null>(null); // データベースのドリルID
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [editorHelpOpen, setEditorHelpOpen] = useState(false);
  const [pendingNewMembers, setPendingNewMembers] = useState<Member[] | null>(null);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [lineEditState, setLineEditState] = useState<LineEditState>(null);
  const [boxEditState, setBoxEditState] = useState<BoxEditState>(null);
  const [confirmedCountsCollapsed, setConfirmedCountsCollapsed] = useState(false);
  const [filteredMemberIds, setFilteredMemberIds] = useState<string[]>([]);
  const [filteredSetIds, setFilteredSetIds] = useState<string[]>([]);
  
  // クリップボード機能
  const { copyToClipboard, pasteFromClipboard } = useClipboard();

  // クライアント側でのみマウントされたことを確認
  useEffect(() => {
    setIsMounted(true);
    
    // URLパラメータからドリルIDを取得
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    
    if (id) {
      // データベースからドリルを読み込む
      loadDrillFromDatabase(id);
      setDrillDbId(id);
    } else {
      // ローカルストレージからメタデータを読み込み
      const metadata = loadDrillMetadata();
      if (metadata) {
        setDrillTitle(metadata.title || "");
        setDrillDataName(metadata.dataName || "");
      }
    }
  }, []);

  // レイアウト側の「?」ボタンからヘルプを開くためのイベントリスナー
  useEffect(() => {
    const handler = () => setEditorHelpOpen(true);
    if (typeof window !== "undefined") {
      window.addEventListener("open-editor-help", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("open-editor-help", handler);
      }
    };
  }, []);

  // データベースからドリルを読み込む
  const loadDrillFromDatabase = async (id: string) => {
    try {
      console.log("[Load] Loading drill from database, ID:", id);
      const response = await fetch(`/api/drills/${id}`);
      
      console.log("[Load] Response status:", response.status);
      console.log("[Load] Response ok:", response.ok);
      
      if (!response.ok) {
        let errorMessage = "Failed to load drill";
        let errorData: any = {};
        
        try {
          const contentType = response.headers.get("content-type");
          const isJSON = contentType && contentType.includes("application/json");
          
          if (isJSON) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            console.error("[Load] Error response:", JSON.stringify(errorData, null, 2));
            console.error("[Load] Error message:", errorData.message);
            console.error("[Load] Error details:", errorData.details);
          } else {
            const text = await response.text();
            console.error("[Load] Error response text:", text.substring(0, 500));
            errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (e) {
          console.error("[Load] Failed to parse error response:", e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("[Load] Drill data received:", {
        id: data.id,
        title: data.title,
        setsCount: data.sets?.length || 0,
        membersCount: data.members?.length || 0,
      });
      
      if (!data.sets || !Array.isArray(data.sets)) {
        throw new Error("Invalid drill data: sets is missing or not an array");
      }
      
      if (!data.members || !Array.isArray(data.members)) {
        throw new Error("Invalid drill data: members is missing or not an array");
      }
      
      // ドリルデータを復元
      restoreState(data.sets, [], data.sets[0]?.id || "");
      setMembers(data.members);
      setDrillTitle(data.title || "");
      setDrillDataName(data.dataName || "");
      console.log("[Load] Drill loaded successfully");
    } catch (error) {
      console.error("[Load] Error loading drill from database:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Load] Full error:", error);
      alert(`ドリルの読み込みに失敗しました: ${errorMessage}`);
    }
  };

  // データベースにドリルを保存
  const saveDrillToDatabase = async () => {
    try {
      const payload = {
        title: drillTitle || "無題",
        dataName: drillDataName || "",
        sets,
        members,
      };

      if (drillDbId) {
        // 既存のドリルを更新
        const response = await fetch(`/api/drills/${drillDbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to update drill");
        }
      } else {
        // 新規ドリルを作成
        const response = await fetch("/api/drills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to create drill");
        }

        const data = await response.json();
        setDrillDbId(data.id);
        
        // URLを更新（リロードしない）
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("id", data.id);
        window.history.pushState({}, "", newUrl.toString());
      }

      alert("データベースに保存しました");
    } catch (error) {
      console.error("Error saving drill to database:", error);
      alert("データベースへの保存に失敗しました");
    }
  };

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

  // 再生テンポ（BPM）は設定から取得
  const playbackBPM = settings.playbackBPM;

  // 再生系
  const {
    currentCount,
    isPlaying,
    playbackPositions,
    handleScrub,
    startPlayBySetId,
    startPlayByCountRange,
    stopPlay,
    clearPlaybackView,
    setRecordingMode,
    setCountFromMusic,
    setMusicSyncMode,
  } = useDrillPlayback(sets as UiSet[], members as any, playbackBPM);

  // 再生範囲（開始 / 終了セットの ID）
  const [playStartId, setPlayStartId] = useState<string>("");
  const [playEndId, setPlayEndId] = useState<string>("");

  // カウントベースの再生範囲（任意のカウントから任意のカウントまで）
  const [playRangeStartCount, setPlayRangeStartCount] = useState<number>(0);
  const [playRangeEndCount, setPlayRangeEndCount] = useState<number>(64);

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

  // 音楽同期（再生・マーカー管理のみ利用。テンポ同期は現状オフ）
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

  // 再生開始（カウント範囲ベース。セットIDベースの指定があればそれも併用）
  const handleStartPlay = () => {
    if (!sets.length) return;

    const startCount = Math.max(0, Math.round(playRangeStartCount));
    const endCount = Math.max(startCount + 1, Math.round(playRangeEndCount));

    // 音源が読み込まれていて、マーカーが1つ以上ある場合は音楽同期モードを有効化
    const shouldUseMusicSync = musicState.isLoaded && musicState.markers.length > 0;
    
    if (shouldUseMusicSync) {
      // 音楽同期モード: 開始カウントに対応する音楽時間を計算してシーク
      const musicTime = getMusicTimeFromCount(startCount);
      if (musicTime !== null) {
        seekToMusicTime(musicTime);
        setMusicSyncMode(true);
        playMusic();
        // 音楽同期モードでは、カウントは音楽から設定されるので、エンジンは開始位置だけ設定
        startPlayByCountRange(startCount, endCount);
      } else {
        // マーカー範囲外の場合は通常モード
        setMusicSyncMode(false);
        if (musicState.isLoaded) {
          seekToMusicTime(0);
          playMusic();
        }
        startPlayByCountRange(startCount, endCount);
      }
    } else {
      // 通常モード: BPMベースでエンジンがカウントを進める
      setMusicSyncMode(false);
      if (musicState.isLoaded) {
        seekToMusicTime(0);
        playMusic();
      }
      startPlayByCountRange(startCount, endCount);
    }
  };

  // ===== ズーム機能 =====
  // デフォルトスケールを計算（グリッド全体が見えるように）
  // コンテナの実際のサイズに基づいて動的に計算
  const [defaultScale, setDefaultScale] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateDefaultScale = () => {
      if (!canvasContainerRef.current || typeof window === "undefined") {
        // フォールバック: 画面サイズから推定
        const canvasWidth = 700;
        const canvasHeight = 560;
        const estimatedWidth = Math.min(window.innerWidth * 0.8, 1400);
        const estimatedHeight = window.innerHeight * 0.6;
        const scaleByWidth = (estimatedWidth - 40) / canvasWidth;
        const scaleByHeight = (estimatedHeight - 40) / canvasHeight;
        const calculatedScale = Math.min(scaleByWidth, scaleByHeight) * 0.9;
        setDefaultScale(Math.min(Math.max(calculatedScale, 0.3), 1.5));
        return;
      }
      
      const container = canvasContainerRef.current;
      const containerWidth = container.clientWidth || container.offsetWidth;
      const containerHeight = container.clientHeight || container.offsetHeight;
      
      // コンテナサイズが取得できない場合はフォールバック
      if (containerWidth === 0 || containerHeight === 0) {
        const canvasWidth = 700;
        const canvasHeight = 560;
        const estimatedWidth = Math.min(window.innerWidth * 0.8, 1400);
        const estimatedHeight = window.innerHeight * 0.6;
        const scaleByWidth = (estimatedWidth - 40) / canvasWidth;
        const scaleByHeight = (estimatedHeight - 40) / canvasHeight;
        const calculatedScale = Math.min(scaleByWidth, scaleByHeight) * 0.9;
        setDefaultScale(Math.min(Math.max(calculatedScale, 0.3), 1.5));
        return;
      }
      
      const canvasWidth = 700;
      const canvasHeight = 560; // 40/50 * 700
      
      // 余白を考慮
      const padding = 40;
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;
      
      // 幅と高さの両方を考慮して、小さい方のスケールを使用
      const scaleByWidth = availableWidth / canvasWidth;
      const scaleByHeight = availableHeight / canvasHeight;
      const calculatedScale = Math.min(scaleByWidth, scaleByHeight);
      
      // 0.3倍から1.5倍の範囲に制限（余裕を持たせるため0.9を掛ける）
      const finalScale = Math.min(Math.max(calculatedScale * 0.9, 0.3), 1.5);
      setDefaultScale(finalScale);
    };

    // 少し遅延させてコンテナのサイズが確定するのを待つ
    const timeoutId = setTimeout(calculateDefaultScale, 100);
    
    // ウィンドウサイズ変更時にも再計算
    window.addEventListener('resize', calculateDefaultScale);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateDefaultScale);
    };
  }, [isMounted]); // isMountedがtrueになってから実行

  const {
    canvasScale,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    setZoom,
  } = useCanvasZoom(defaultScale);

  // デフォルトスケールが計算されたら、それを適用
  useEffect(() => {
    if (defaultScale !== 1 && canvasScale === 1) {
      setZoom(defaultScale);
    }
  }, [defaultScale, canvasScale, setZoom]);

  // 再生中のみ playbackPositions を表示に使う（停止中は通常のSET位置を使う）
  const hasPlayback = isPlaying && Object.keys(playbackPositions).length > 0;
  // 一時的な位置がある場合は「現在のSETの位置」に上書きする形で表示し、
  // 存在しないメンバーが消えて見えないようにする
  const basePositionsForDisplay = currentSet.positions as Record<string, WorldPos>;
  const displayPositions: Record<string, WorldPos> = hasPlayback
    ? playbackPositions
    : pendingPositions
    ? { ...basePositionsForDisplay, ...pendingPositions }
    : basePositionsForDisplay;

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
  // - positionsByCount に登録されたカウント
  // - 各 Set の startCount（構造上のSETとして扱う）
  const getConfirmedCounts = useCallback(() => {
    const allConfirmedCounts = new Set<number>();
    
    sets.forEach(set => {
      // Set 自体の startCount も「確定カウント」とみなす
      allConfirmedCounts.add(Math.round(set.startCount));

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

  // コピー機能（選択メンバーの位置をクリップボードに保存）
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "コピーするメンバーを選択してください",
      });
      return;
    }

    const currentSet = sets.find((s) => s.id === currentSetId);
    if (!currentSet) return;

    const positionsToCopy: Record<string, WorldPos> = {};
    selectedIds.forEach((id) => {
      if (currentSet.positions[id]) {
        positionsToCopy[id] = { ...currentSet.positions[id] };
      }
    });

    copyToClipboard({
      type: "members",
      positions: positionsToCopy,
      memberIds: selectedIds,
    });

    addGlobalNotification({
      type: "success",
      message: `${selectedIds.length}個のメンバーをコピーしました`,
    });
  }, [selectedIds, sets, currentSetId, copyToClipboard]);

  // ペースト機能（クリップボードから位置を貼り付け）
  const handlePaste = useCallback(() => {
    const clipboardData = pasteFromClipboard();
    if (!clipboardData || clipboardData.type !== "members") {
      addGlobalNotification({
        type: "warning",
        message: "クリップボードにコピーされたデータがありません",
      });
      return;
    }

    if (clipboardData.memberIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "コピーされたデータにメンバーが含まれていません",
      });
      return;
    }

    // 現在のセットに位置を貼り付け
    const updatedSets = sets.map((set) => {
      if (set.id !== currentSetId) return set;
      return {
        ...set,
        positions: {
          ...set.positions,
          ...clipboardData.positions,
        },
      };
    });

    restoreState(updatedSets, clipboardData.memberIds, currentSetId);
    addGlobalNotification({
      type: "success",
      message: `${clipboardData.memberIds.length}個のメンバーを貼り付けました`,
    });
  }, [sets, currentSetId, pasteFromClipboard, restoreState]);

  // 削除機能（選択メンバーをドリル全体から削除）
  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "削除するメンバーを選択してください",
      });
      return;
    }

    const ok = window.confirm(
      `選択中のメンバー（${selectedIds.length}人）を削除します。\n` +
      `このドリル内のすべてのセットから、これらのメンバーの位置情報が削除されます。\n\n` +
      `本当に削除してもよろしいですか？`
    );
    if (!ok) return;

    // メンバーリストからも削除
    setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));

    // すべてのセットから、該当メンバーの位置情報を削除
    const updatedSets = sets.map((set) => {
      const newPositions = { ...set.positions };
      selectedIds.forEach((id) => {
        delete newPositions[id];
      });

      let newPositionsByCount = set.positionsByCount;
      if (set.positionsByCount) {
        const updatedByCount: typeof set.positionsByCount = {};
        Object.entries(set.positionsByCount).forEach(([countKey, posMap]) => {
          const newMap = { ...posMap };
          selectedIds.forEach((id) => {
            delete newMap[id];
          });
          // 全て消えたカウントはスキップ
          if (Object.keys(newMap).length > 0) {
            updatedByCount![Number(countKey)] = newMap;
          }
        });
        newPositionsByCount = updatedByCount;
      }

      return {
        ...set,
        positions: newPositions,
        positionsByCount: newPositionsByCount,
      };
    });

    restoreState(updatedSets, [], currentSetId);
    addGlobalNotification({
      type: "success",
      message: `${selectedIds.length}個のメンバーを削除しました`,
    });
  }, [selectedIds, sets, currentSetId, restoreState, setMembers]);

  // 全選択解除
  const handleDeselectAll = useCallback(() => {
    handleSelectBulk([]);
  }, [handleSelectBulk]);

  // タイムラインやダブルクリックから「このカウントにSETマーカーを打つ / 既存SETを削除」
  const handleToggleSetAtCount = useCallback(
    (count: number) => {
      const rounded = Math.max(0, Math.round(count));

      const targetSet = sets.find(
        (s) => Math.round(s.startCount) === rounded
      );

      if (targetSet) {
        const confirmed = window.confirm(
          `Count ${rounded} にあるセット（${targetSet.name || "無名セット"}）を削除しますか？\nこのセットに紐づく位置情報も失われます。`
        );
        if (!confirmed) return;
        deleteSet(targetSet.id);
        return;
      }

      // そのカウントにSETがなければ新規に追加
      addSetAtCount(rounded);
    },
    [sets, addSetAtCount, deleteSet]
  );

  // 確定カウントやタイムラインバーから安全にジャンプするためのヘルパー
  const handleJumpToCountSafe = useCallback(
    (count: number) => {
      if (pendingPositions && !isPlaying) {
        const confirmed = window.confirm(
          '位置を変更しましたが、まだ保存していません。\n' +
            'このままカウントを変更すると、変更が失われます。\n\n' +
            'OKを押すと変更を破棄してカウントを変更します。\n' +
            'キャンセルを押すとカウント変更を中止します。'
        );

        if (!confirmed) {
          return;
        } else {
          setPendingPositions(null);
          setLineEditState(null);
          setBoxEditState(null);
        }
      }
      clearPlaybackView();
      handleScrub(count);
    },
    [pendingPositions, isPlaying, clearPlaybackView, handleScrub]
  );

  // セット切り替え（前/次）
  const handleSetPrevious = useCallback(() => {
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const currentIndex = sortedSets.findIndex((s) => s.id === currentSetId);
    if (currentIndex > 0) {
      setCurrentSetId(sortedSets[currentIndex - 1].id);
      handleSelectBulk([]);
    }
  }, [sets, currentSetId, setCurrentSetId, handleSelectBulk]);

  const handleSetNext = useCallback(() => {
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const currentIndex = sortedSets.findIndex((s) => s.id === currentSetId);
    if (currentIndex < sortedSets.length - 1) {
      setCurrentSetId(sortedSets[currentIndex + 1].id);
      handleSelectBulk([]);
    }
  }, [sets, currentSetId, setCurrentSetId, handleSelectBulk]);

  // グリッド表示切り替え
  const handleToggleGrid = useCallback(() => {
    updateSettings({ showGrid: !settings.showGrid });
  }, [settings.showGrid, updateSettings]);

  // ショートカットカスタマイズ機能
  const { getShortcut } = useShortcuts();

  // ショートカット定義（カスタマイズ可能）
  const shortcutDefinitions: ShortcutDefinition[] = useMemo(
    () => [
      {
        id: "copy",
        keys: getShortcut("copy"),
        action: handleCopy,
        description: "選択メンバーをコピー",
        category: "編集",
      },
      {
        id: "paste",
        keys: getShortcut("paste"),
        action: handlePaste,
        description: "クリップボードから貼り付け",
        category: "編集",
      },
      {
        id: "delete",
        keys: getShortcut("delete"),
        action: handleDelete,
        description: "選択メンバーを削除",
        category: "編集",
      },
      {
        id: "backspace",
        keys: getShortcut("backspace"),
        action: handleDelete,
        description: "選択メンバーを削除",
        category: "編集",
      },
      {
        id: "deselect-all",
        keys: getShortcut("deselectAll"),
        action: handleDeselectAll,
        description: "全選択解除",
        category: "選択",
      },
      {
        id: "set-previous",
        keys: getShortcut("setPrevious"),
        action: handleSetPrevious,
        description: "前のセットに切り替え",
        category: "セット操作",
      },
      {
        id: "set-next",
        keys: getShortcut("setNext"),
        action: handleSetNext,
        description: "次のセットに切り替え",
        category: "セット操作",
      },
      {
        id: "zoom-in",
        keys: getShortcut("zoomIn"),
        action: handleZoomIn,
        description: "ズームイン",
        category: "表示",
      },
      {
        id: "zoom-in-plus",
        keys: { key: "+", ctrl: true },
        action: handleZoomIn,
        description: "ズームイン",
        category: "表示",
      },
      {
        id: "zoom-out",
        keys: getShortcut("zoomOut"),
        action: handleZoomOut,
        description: "ズームアウト",
        category: "表示",
      },
      {
        id: "toggle-grid",
        keys: getShortcut("toggleGrid"),
        action: handleToggleGrid,
        description: "グリッド表示の切り替え",
        category: "表示",
      },
      {
        id: "shortcut-help",
        keys: getShortcut("shortcutHelp"),
        action: () => setShortcutHelpOpen(true),
        description: "ショートカットヘルプを表示",
        category: "ヘルプ",
      },
    ],
    [
      getShortcut,
      handleCopy,
      handlePaste,
      handleDelete,
      handleDeselectAll,
      handleSetPrevious,
      handleSetNext,
      handleZoomIn,
      handleZoomOut,
      handleToggleGrid,
    ]
  );

  // キーボードショートカットを有効化
  useKeyboardShortcuts({
    enabled: !commandPaletteOpen && !isMetadataDialogOpen,
    shortcuts: shortcutDefinitions,
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
      id: "save-db",
      label: "データベースに保存",
      shortcut: "Ctrl+Shift+S",
      icon: "💾",
      group: "file",
      action: saveDrillToDatabase,
    },
    {
      id: "drills-list",
      label: "ドリル一覧",
      icon: "📋",
      group: "file",
      action: () => window.location.href = "/drills",
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
    // セット操作
    {
      id: "add-set-tail",
      label: "セット追加（最後尾）",
      icon: "➕",
      group: "set",
      action: () => addSetTail(),
    },
    {
      id: "add-set-current",
      label: "セット追加（現在のカウント）",
      icon: "➕",
      group: "set",
      action: () => addSetAtCount(currentCount || 0),
    },
    {
      id: "delete-set",
      label: "セット削除",
      icon: "🗑️",
      group: "set",
      action: () => {
        if (currentSet) {
          if (confirm(`セット「${currentSet.name || "無名セット"}」を削除しますか？`)) {
            deleteSet(currentSetId);
          }
        }
      },
    },
    {
      id: "copy-set",
      label: "セットコピー",
      icon: "📋",
      group: "set",
      action: () => {
        if (currentSet) {
          copySet(currentSetId);
        }
      },
    },
    {
      id: "set-previous",
      label: "前のセットに切り替え",
      shortcut: "Ctrl+[",
      icon: "◀",
      group: "set",
      action: handleSetPrevious,
    },
    {
      id: "set-next",
      label: "次のセットに切り替え",
      shortcut: "Ctrl+]",
      icon: "▶",
      group: "set",
      action: handleSetNext,
    },
    // メンバー操作
    {
      id: "select-all",
      label: "全選択",
      shortcut: "Ctrl+A",
      icon: "☑️",
      group: "member",
      action: () => {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const allIds = Object.keys(currentSet.positions);
          handleSelectBulk(allIds);
        }
      },
    },
    {
      id: "deselect-all",
      label: "全選択解除",
      shortcut: "Ctrl+D",
      icon: "☐",
      group: "member",
      action: handleDeselectAll,
    },
    {
      id: "copy",
      label: "コピー",
      shortcut: "Ctrl+C",
      icon: "📋",
      group: "member",
      action: handleCopy,
    },
    {
      id: "paste",
      label: "貼り付け",
      shortcut: "Ctrl+V",
      icon: "📄",
      group: "member",
      action: handlePaste,
    },
    {
      id: "delete",
      label: "削除",
      shortcut: "Delete",
      icon: "🗑️",
      group: "member",
      action: handleDelete,
    },
    // 整列
    {
      id: "arrange-line",
      label: "直線整列",
      icon: "📐",
      group: "arrange",
      action: arrangeLineSelected,
    },
    {
      id: "arrange-line-order",
      label: "選択順で直線整列",
      icon: "📏",
      group: "arrange",
      action: () => arrangeLineBySelectionOrder && arrangeLineBySelectionOrder(),
    },
    {
      id: "arrange-circle",
      label: "円形整列",
      icon: "⭕",
      group: "arrange",
      action: () => {
        if (selectedIds.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "整列するメンバーを選択してください",
          });
          return;
        }
        setIsLayoutModalOpen(true);
        // 円形整列モードを設定（モーダルで処理）
      },
    },
    {
      id: "arrange-rectangle",
      label: "矩形整列",
      icon: "▭",
      group: "arrange",
      action: () => {
        if (selectedIds.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "整列するメンバーを選択してください",
          });
          return;
        }
        setIsLayoutModalOpen(true);
        // 矩形整列モードを設定（モーダルで処理）
      },
    },
    {
      id: "arrange-spiral",
      label: "スパイラル整列",
      icon: "🌀",
      group: "arrange",
      action: () => {
        if (selectedIds.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "整列するメンバーを選択してください",
          });
          return;
        }
        setIsLayoutModalOpen(true);
        // スパイラル整列モードを設定（モーダルで処理）
      },
    },
    {
      id: "arrange-box",
      label: "ボックス整列",
      icon: "📦",
      group: "arrange",
      action: () => {
        if (selectedIds.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "整列するメンバーを選択してください",
          });
          return;
        }
        setIsLayoutModalOpen(true);
        // ボックス整列モードを設定（モーダルで処理）
      },
    },
    // 変形
    {
      id: "rotate",
      label: "回転",
      icon: "🔄",
      group: "transform",
      action: () => {
        if (selectedIds.length < 2) {
          addGlobalNotification({
            type: "warning",
            message: "回転するには2つ以上のメンバーを選択してください",
          });
          return;
        }
        // 回転モードを開始（実際の実装はFieldCanvasで処理）
      },
    },
    {
      id: "scale",
      label: "拡大縮小",
      icon: "🔍",
      group: "transform",
      action: () => {
        if (selectedIds.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "拡大縮小するメンバーを選択してください",
          });
          return;
        }
        // 拡大縮小モードを開始（実際の実装はFieldCanvasで処理）
      },
    },
    // 再生
    {
      id: "play",
      label: "再生",
      icon: "▶️",
      group: "playback",
      action: handleStartPlay,
    },
    {
      id: "stop",
      label: "停止",
      icon: "⏹️",
      group: "playback",
      action: () => {
        setMusicSyncMode(false);
        stopPlay();
        if (musicState.isPlaying) {
          stopMusic();
        }
      },
    },
    {
      id: "clear-playback",
      label: "再生表示をクリア",
      icon: "🧹",
      group: "playback",
      action: clearPlaybackView,
    },
    // 表示
    {
      id: "3d-preview",
      label: "3Dプレビュー",
      icon: "🎥",
      group: "view",
      action: () => setIs3DPreviewOpen(true),
    },
    {
      id: "toggle-grid",
      label: "グリッド表示の切り替え",
      icon: "⊞",
      group: "view",
      action: handleToggleGrid,
    },
    {
      id: "zoom-in",
      label: "ズームイン",
      shortcut: "Ctrl++",
      icon: "🔍",
      group: "view",
      action: handleZoomIn,
    },
    {
      id: "zoom-out",
      label: "ズームアウト",
      shortcut: "Ctrl+-",
      icon: "🔍",
      group: "view",
      action: handleZoomOut,
    },
    {
      id: "zoom-reset",
      label: "ズームリセット",
      icon: "🎯",
      group: "view",
      action: handleZoomReset,
    },
    {
      id: "toggle-statistics",
      label: "統計パネルの表示切り替え",
      icon: "📊",
      group: "view",
      action: () => updateSettings({ showStatistics: !settings.showStatistics }),
    },
    // 設定・ヘルプ
    {
      id: "grid-editor",
      label: "グリッドエディタを開く",
      icon: "⚙️",
      group: "settings",
      action: () => window.location.href = "/grid-editor",
    },
    {
      id: "settings",
      label: "設定を開く",
      icon: "⚙️",
      group: "settings",
      action: () => window.location.href = "/settings",
    },
    {
      id: "shortcut-help",
      label: "ショートカットヘルプ",
      shortcut: "Ctrl+?",
      icon: "❓",
      group: "help",
      action: () => setShortcutHelpOpen(true),
    },
    {
      id: "editor-help",
      label: "エディタヘルプ",
      icon: "📖",
      group: "help",
      action: () => setEditorHelpOpen(true),
    },
  ];

  // ヘッダーメニュー用のグループ
  const menuGroups = [
    {
      label: "ファイル",
      items: [
        {
          label: "ドリルを新規作成",
          icon: "🆕",
          action: () => {
            const ok = confirm(
              "新しいドリルを作成しますか？\n\n現在のドリルの内容（ローカル保存分を含む）は失われます。"
            );
            if (!ok) return;

            // ローカルのドリル・メンバー・メタデータをクリアしてリロード
            clearDrillFromLocalStorage();
            clearMembersFromLocalStorage();
            clearDrillMetadata();
            window.location.href = "/drill";
          },
        },
        { divider: true },
        {
          label: "保存（ローカル）",
          icon: "💾",
          shortcut: "Ctrl+S",
          action: handleSave,
        },
        {
          label: "データベースに保存",
          icon: "💾",
          shortcut: "Ctrl+Shift+S",
          action: saveDrillToDatabase,
        },
        {
          label: "読み込み",
          icon: "📂",
          shortcut: "Ctrl+O",
          action: handleLoad,
        },
        {
          label: "ドリル一覧",
          icon: "📋",
          action: () => window.location.href = "/drills",
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
    startPlayByCountRange,
    playMusic,
    getMusicTimeFromCount,
    setCountFromMusic,
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
  // - pendingPositions を現在の SET / positionsByCount に書き込み
  // - かつ「そのカウントを startCount に持つ SET」がなければ新規作成する
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
      
      const mergedBasePositions = {
        ...set.positions,
        ...pendingPositions,
      };
      
      return {
        ...set,
        // 現在表示中のSETの「ベース位置」も、確定した pendingPositions に合わせて更新
        positions: mergedBasePositions,
        positionsByCount: newPositionsByCount,
      };
    });

    // ① 「現在の確定カウント = startCount を持つ SET」が存在しなければ、新しく SET を追加する
    const hasSetAtCurrentCount = updatedSets.some(
      (s) => Math.round(s.startCount) === currentCountRounded
    );

    let finalSets = updatedSets;

    if (!hasSetAtCurrentCount) {
      const baseSet = updatedSets.find((s) => s.id === currentSetId) ?? updatedSets[0];

      const newId = `set-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newSet: UiSet = {
        id: newId,
        name: "", // 名前は後からユーザーが付けられるよう空にしておく
        startCount: currentCountRounded,
        positions: {
          // ベースSETの位置をベースに、確定した位置で上書き
          ...(baseSet?.positions ?? {}),
          ...pendingPositions,
        },
        // メモ類はベースSETを引き継ぐ
        note: baseSet?.note ?? "",
        instructions: baseSet?.instructions ?? "",
        nextMove: baseSet?.nextMove ?? "",
      };

      finalSets = [...updatedSets, newSet].sort(
        (a, b) => a.startCount - b.startCount
      );
    }
    
    // restoreStateを使って状態を更新
    restoreState(finalSets, selectedIds, currentSetId);
    
    // 一時的な位置をクリア
    setPendingPositions(null);
    setLineEditState(null);
    setBoxEditState(null);

    // ユーザー向けフィードバック
    addGlobalNotification({
      type: "success",
      message: "位置を確定しました。",
    });
  }, [pendingPositions, currentCount, currentSetId, sets, selectedIds, restoreState, setLineEditState, setBoxEditState]);

  const handleSelectBulkWrapped = (ids: string[]) => {
    clearPlaybackView();
    handleSelectBulk(ids);
  };

  const nudgeSelectedWrapped = (dx: number, dy: number) => {
    clearPlaybackView();
    nudgeSelected(dx, dy);
  };

  // じっくりモード用：一括追加直後の初期配置レイアウト確定
  const handleConfirmNewMembersLayout = useCallback(
    (layout: "line" | "circle" | "box") => {
      if (!pendingNewMembers || pendingNewMembers.length === 0) {
        setIsLayoutModalOpen(false);
        return;
      }

      const newIds = pendingNewMembers.map((m) => m.id);

      const current = sets.find((s) => s.id === currentSetId);
      if (!current) {
        setPendingNewMembers(null);
        setIsLayoutModalOpen(false);
        return;
      }

      const centerX = settings.fieldWidth / 2;
      const centerY = settings.fieldHeight / 2;

      const basePositions: Record<string, WorldPos> =
        pendingPositions || currentSet.positions;

      const newPositionsPatch: Record<string, WorldPos> = {};

      if (layout === "line") {
        const n = newIds.length;
        const margin = 5;
        const startX = margin;
        const endX = settings.fieldWidth - margin;
        const step = n > 1 ? (endX - startX) / (n - 1) : 0;
        const y = centerY;
        newIds.forEach((id, idx) => {
          const raw = { x: startX + step * idx, y };
          newPositionsPatch[id] = clampAndSnap(raw);
        });
      } else if (layout === "circle") {
        const n = newIds.length;
        const radius = Math.min(settings.fieldWidth, settings.fieldHeight) / 6;
        newIds.forEach((id, idx) => {
          const angle = (idx / Math.max(n, 1)) * Math.PI * 2;
          const raw = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
          };
          newPositionsPatch[id] = clampAndSnap(raw);
        });
      } else if (layout === "box") {
        const n = newIds.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const spacing = 2 * STEP_M;

        const totalWidth = (cols - 1) * spacing;
        const totalHeight = (rows - 1) * spacing;
        const startX = centerX - totalWidth / 2;
        const startY = centerY - totalHeight / 2;

        newIds.forEach((id, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const raw = {
            x: startX + col * spacing,
            y: startY + row * spacing,
          };
          newPositionsPatch[id] = clampAndSnap(raw);
        });

        // ボックス用編集状態（四隅）も保存
        const tl: WorldPos = { x: startX, y: startY };
        const tr: WorldPos = { x: startX + totalWidth, y: startY };
        const bl: WorldPos = { x: startX, y: startY + totalHeight };
        const br: WorldPos = { x: startX + totalWidth, y: startY + totalHeight };

        setBoxEditState({
          memberIds: newIds,
          cols,
          rows,
          tl,
          tr,
          br,
          bl,
        });
      }

      // pendingPositions に新しいレイアウトを反映（まだ確定しない）
      const combinedPositions: Record<string, WorldPos> = {
        ...basePositions,
        ...newPositionsPatch,
      };
      setPendingPositions(combinedPositions);

      // ラインレイアウトの場合は端点ハンドル用の状態も保存
      if (layout === "line") {
        let minX = Infinity;
        let maxX = -Infinity;
        let y = centerY;
        newIds.forEach((id) => {
          const p = combinedPositions[id];
          if (!p) return;
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          y = p.y;
        });
        if (isFinite(minX) && isFinite(maxX)) {
          setLineEditState({
            memberIds: newIds,
            start: { x: minX, y },
            end: { x: maxX, y },
          });
        }
      } else {
        setLineEditState(null);
      }

      // メンバー本体はこのタイミングで登録
      setMembers((prev) => [...prev, ...pendingNewMembers]);

      setPendingNewMembers(null);
      setIsLayoutModalOpen(false);
    },
    [
      pendingNewMembers,
      sets,
      currentSetId,
      settings.fieldWidth,
      settings.fieldHeight,
      clampAndSnap,
      pendingPositions,
      setMembers,
      setPendingNewMembers,
      setIsLayoutModalOpen,
      setPendingPositions,
      setLineEditState,
      setBoxEditState,
    ]
  );

  // 横一列レイアウトの端点更新（ハンドルドラッグ時）
  const handleUpdateLineEdit = useCallback(
    (start: WorldPos, end: WorldPos) => {
      if (!lineEditState || !pendingPositions) return;
      const ids = lineEditState.memberIds;
      const n = ids.length;
      if (n === 0) return;

      const newPatch: Record<string, WorldPos> = {};
      // 端点はスナップ付きで決定
      const snappedStart = clampAndSnap(start);
      const snappedEnd = clampAndSnap(end);

      ids.forEach((id, index) => {
        const t = n > 1 ? index / (n - 1) : 0;
        const x = snappedStart.x + (snappedEnd.x - snappedStart.x) * t;
        const y = snappedStart.y + (snappedEnd.y - snappedStart.y) * t;
        // 中間メンバーはスナップせず、そのままのインターバルを維持
        // ただしフィールド外には出さない
        const clamped: WorldPos = {
          x: Math.min(Math.max(x, 0), settings.fieldWidth),
          y: Math.min(Math.max(y, 0), settings.fieldHeight),
        };
        newPatch[id] = clamped;
      });

      setPendingPositions({
        ...pendingPositions,
        ...newPatch,
      });
      setLineEditState({
        memberIds: ids,
        start: snappedStart,
        end: snappedEnd,
      });
    },
    [lineEditState, pendingPositions, clampAndSnap, settings.fieldWidth, settings.fieldHeight]
  );

  // ボックスレイアウトの四隅更新（ハンドルドラッグ時）
  const handleUpdateBoxEdit = useCallback(
    (corners: { tl: WorldPos; tr: WorldPos; br: WorldPos; bl: WorldPos }) => {
      if (!boxEditState || !pendingPositions) return;
      const { memberIds, cols, rows } = boxEditState;
      if (!cols || !rows) return;

      // 端点はスナップしつつ、内側は比率で補間（スナップなし）してインターバル維持
      const tl = clampAndSnap(corners.tl);
      const tr = clampAndSnap(corners.tr);
      const br = clampAndSnap(corners.br);
      const bl = clampAndSnap(corners.bl);

      const newPatch: Record<string, WorldPos> = {};

      memberIds.forEach((id, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const u = cols > 1 ? col / (cols - 1) : 0; // 横方向 0〜1
        const v = rows > 1 ? row / (rows - 1) : 0; // 縦方向 0〜1

        // 4隅からの二重線形補間（平行四辺形内の位置）
        const x =
          tl.x * (1 - u) * (1 - v) +
          tr.x * u * (1 - v) +
          br.x * u * v +
          bl.x * (1 - u) * v;
        const y =
          tl.y * (1 - u) * (1 - v) +
          tr.y * u * (1 - v) +
          br.y * u * v +
          bl.y * (1 - u) * v;

        const clamped: WorldPos = {
          x: Math.min(Math.max(x, 0), settings.fieldWidth),
          y: Math.min(Math.max(y, 0), settings.fieldHeight),
        };
        newPatch[id] = clamped;
      });

      setPendingPositions({
        ...pendingPositions,
        ...newPatch,
      });

      setBoxEditState({
        memberIds,
        cols,
        rows,
        tl,
        tr,
        br,
        bl,
      });
    },
    [boxEditState, pendingPositions, clampAndSnap, settings.fieldWidth, settings.fieldHeight]
  );

  // 音楽時間からカウントへの自動同期（マーカーがある場合のみ）
  useEffect(() => {
    if (!isPlaying || !musicState.isLoaded || !musicState.isPlaying) return;
    if (musicState.markers.length === 0) return;
    
    // 音楽同期モードが有効な場合のみ、音楽時間からカウントを計算
    const count = getCountFromMusicTime(musicState.currentTime);
    if (count !== null) {
      setCountFromMusic(count);
    }
  }, [isPlaying, musicState.isLoaded, musicState.isPlaying, musicState.currentTime, musicState.markers, getCountFromMusicTime, setCountFromMusic]);

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

      // Ctrl/Cmd + S : 保存（ローカル）
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl/Cmd + Shift + S : データベースに保存
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        saveDrillToDatabase();
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

      // Enter: 位置確定（pendingPositions がある場合）
      if (e.key === "Enter" && pendingPositions) {
        e.preventDefault();
        handleConfirmPositions();
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
    pendingPositions,
    handleConfirmPositions,
  ]);

  return (
    <>
      {/* じっくりモード用：一括追加後のレイアウト選択モーダル */}
      {isLayoutModalOpen && pendingNewMembers && settings.memberAddMode === "careful" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setPendingNewMembers(null);
            setIsLayoutModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-100">
              メンバーの初期配置を選択
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              今回追加するメンバー
              <span className="font-mono text-slate-200"> {pendingNewMembers.length}人</span>
              を、どのような並びで最初に配置するか選んでください。
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleConfirmNewMembersLayout("line")}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/70 hover:border-emerald-500/60 text-slate-100 text-sm transition-colors"
              >
                <span>横一列に並べる</span>
                <span className="text-xs text-slate-400">フィールド中央付近に横一列</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmNewMembersLayout("circle")}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/70 hover:border-emerald-500/60 text-slate-100 text-sm transition-colors"
              >
                <span>円形に並べる</span>
                <span className="text-xs text-slate-400">中央を中心とした円形フォーメーション</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmNewMembersLayout("box")}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/70 hover:border-emerald-500/60 text-slate-100 text-sm transition-colors"
              >
                <span>ボックス（グリッド）に並べる</span>
                <span className="text-xs text-slate-400">縦横に詰めたブロック隊形</span>
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPendingNewMembers(null);
                  setIsLayoutModalOpen(false);
                }}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-700/60 hover:bg-slate-700/80 text-slate-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      {/* コマンドパレット */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* ショートカットヘルプダイアログ */}
      <ShortcutHelpDialog
        shortcuts={shortcutDefinitions}
        open={shortcutHelpOpen}
        onClose={() => setShortcutHelpOpen(false)}
      />

      {/* エディタ全体のヘルプダイアログ */}
      <EditorHelpDialog
        open={editorHelpOpen}
        onClose={() => setEditorHelpOpen(false)}
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
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-200 uppercase tracking-wider">
                  3Dプレビュー
                </h2>
                {/* 再生・停止ボタン */}
                <button
                  onClick={isPlaying ? handleStopPlay : handleStartPlay}
                  disabled={isRecording3D}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shadow-md ${
                    isPlaying
                      ? "bg-emerald-800/70 border border-emerald-500 text-emerald-50 hover:bg-emerald-900"
                      : "bg-emerald-700/80 border border-emerald-400 text-emerald-50 hover:bg-emerald-600"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isPlaying ? "停止" : "再生"}
                >
                  {isPlaying ? "■" : "▶"}
                </button>
                {isPlaying && (
                  <span className="text-xs text-slate-400">
                    Count: {Math.round(currentCount)}
                  </span>
                )}
              </div>
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
        onConfirm={(options) => handleExportOptionsConfirm(options, drillDataName)}
        sets={sets}
        allowSetSelection={pendingExportType === "pdf" || pendingExportType === "print" || pendingExportType === "image"}
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
      <FileDropZone
        onImport={(data) => {
          // ドリルデータをインポート
          if (data.sets) {
            restoreState(data.sets, [], data.sets[0]?.id || "");
          }
          if (data.settings) {
            updateSettings(data.settings);
          }
        }}
      >
        <div className="relative h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
        {/* メインコンテンツエリア（flex、高さ固定） */}
        <div className="flex-1 flex gap-3 overflow-hidden px-3 py-3 max-md:px-1 max-md:py-1">
          {/* 左サイドバー（コマンド系） */}
          <div className="w-64 shrink-0 flex flex-col gap-3 overflow-hidden max-md:hidden">
            {/* DrillControls */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col h-full">
              <DrillControls
                sets={sets.map((s) => ({
                  id: s.id,
                  name: s.name,
                  startCount: s.startCount,
                  note: s.note,
                  instructions: s.instructions,
                  nextMove: s.nextMove,
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
                onAddSet={undefined}
                onQuickDelete={handleDelete}
                onQuickCopy={handleCopy}
                onQuickArrangeLine={arrangeLineSelected}
                onQuickDeselectAll={handleDeselectAll}
                hasSelection={selectedIds.length > 0}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onDeleteSet={(id: string) => {
                  if (sets.length <= 1) {
                    alert("最後のセットは削除できません");
                    return;
                  }
                  
                  const setToDelete = sets.find((s) => s.id === id);
                  if (!setToDelete) return;
                  
                  const filtered = sets.filter((s) => s.id !== id);
                  const renumbered = filtered.map((s, idx) => ({ ...s, name: `Set ${idx + 1}` }));
                  
                  // 削除されたセットが現在のセットの場合、最初のセットに切り替え
                  const newCurrentSetId = id === currentSetId && renumbered.length > 0
                    ? renumbered[0].id
                    : currentSetId;
                  
                  // 削除されたSETに関連する確定カウントを削除
                  // 削除されたSETのstartCountとpositionsByCountに含まれるカウントを、
                  // 他のSETからも削除する（該当するカウントがそのSETにのみ存在する場合）
                  const deletedSetStartCount = Math.round(setToDelete.startCount);
                  const deletedSetCounts = new Set<number>();
                  deletedSetCounts.add(deletedSetStartCount);
                  
                  if (setToDelete.positionsByCount) {
                    Object.keys(setToDelete.positionsByCount).forEach(countStr => {
                      deletedSetCounts.add(Number(countStr));
                    });
                  }
                  
                  // 削除されたカウントが他のSETにも存在するかチェック
                  // 他のSETに存在しないカウントのみを削除対象とする
                  const countsToRemove = Array.from(deletedSetCounts).filter(count => {
                    // 他のSETに同じカウントが存在するかチェック
                    return !renumbered.some(set => {
                      const setStartCount = Math.round(set.startCount);
                      if (setStartCount === count) return true;
                      if (set.positionsByCount && set.positionsByCount[count]) return true;
                      return false;
                    });
                  });
                  
                  // 削除対象のカウントを他のSETからも削除
                  const cleanedSets = renumbered.map(set => {
                    if (!set.positionsByCount) return set;
                    
                    const cleanedPositionsByCount = { ...set.positionsByCount };
                    let hasChanges = false;
                    
                    countsToRemove.forEach(count => {
                      if (cleanedPositionsByCount[count]) {
                        delete cleanedPositionsByCount[count];
                        hasChanges = true;
                      }
                    });
                    
                    if (hasChanges) {
                      return {
                        ...set,
                        positionsByCount: Object.keys(cleanedPositionsByCount).length > 0
                          ? cleanedPositionsByCount
                          : undefined,
                      };
                    }
                    
                    return set;
                  });
                  
                  restoreState(cleanedSets, [], newCurrentSetId);
                }}
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
                onJumpToCount={handleJumpToCountSafe}
                onChangeNote={handleChangeNote}
                onChangeInstructions={handleChangeInstructions}
                onChangeNextMove={handleChangeNextMove}
              />
            </div>

          </div>

          {/* 中央（フィールド） */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden items-center max-md:gap-1">
            {/* フィールドキャンバス */}
            <div 
              ref={canvasContainerRef}
              className="flex-1 rounded-lg overflow-auto border border-slate-700/80 field-canvas-container shadow-xl w-full max-w-[1400px] bg-transparent flex items-center justify-center"
            >
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
                  lineEditState={lineEditState}
                  onUpdateLineEdit={handleUpdateLineEdit}
                  boxEditState={boxEditState}
                  onUpdateBoxEdit={handleUpdateBoxEdit}
                />
            </div>
          </div>

          {/* 右サイドバー */}
          <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto sidebar-scrollbar max-md:hidden">
            {/* SidePanel（メンバー選択・管理） */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col shrink-0">
              <DrillSidePanel
                members={members as any}
                selectedIds={selectedIds}
                currentSetPositions={displayPositions}
                sets={sets}
                onFilterMembers={setFilteredMemberIds}
                onFilterSets={setFilteredSetIds}
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
                onAddMultipleMembers={(newMembers) => {
                  if (settings.memberAddMode === "careful") {
                    setPendingNewMembers(newMembers as Member[]);
                    setIsLayoutModalOpen(true);
                  } else {
                    setMembers((prev) => [...prev, ...(newMembers as Member[])]);
                  }
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
              {/* 確定カウントのリスト（折りたたみ可能）＋簡易タイムラインバー */}
              {confirmedCounts.length > 0 && !hasPlayback && (
                <div className="p-3 border-t border-slate-700/60 bg-slate-800/40 space-y-1.5">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-xs text-slate-300 font-semibold uppercase tracking-wider"
                    onClick={() => setConfirmedCountsCollapsed((v) => !v)}
                  >
                    <span>確定済みカウント</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                      <span>
                        {confirmedCounts.length}件
                        {confirmedCounts.length > 0 &&
                          `（${confirmedCounts
                            .slice(0, 4)
                            .map((c) => c)
                            .join(", ")}${confirmedCounts.length > 4 ? "…" : ""}）`}
                      </span>
                      <span>{confirmedCountsCollapsed ? "▽" : "△"}</span>
                    </span>
                  </button>
                  {/* 簡易タイムラインバー */}
                  {confirmedCounts.length > 0 && (
                    <div className="mt-1">
                      {(() => {
                        const minCount = Math.min(...confirmedCounts);
                        const maxCount = Math.max(...confirmedCounts);
                        const range = Math.max(1, maxCount - minCount);
                        return (
                          <div className="relative h-6 rounded-full bg-slate-900/80 border border-slate-700/80 px-2 flex items-center">
                            {/* ベースライン */}
                            <div className="absolute inset-x-2 h-[2px] bg-slate-600/60 top-1/2 -translate-y-1/2 pointer-events-none" />
                            {/* マーカー */}
                            {confirmedCounts.map((count) => {
                              const t = (count - minCount) / range;
                              const left = 8 + t * (100 - 16); // padding相当
                              const isCurrent =
                                Math.round(currentCount) === Math.round(count);
                              return (
                                <button
                                  key={`marker-${count}`}
                                  type="button"
                                  onClick={() => handleJumpToCountSafe(count)}
                                  className="absolute -translate-x-1/2 -translate-y-1/2"
                                  style={{ left: `${left}%`, top: "50%" }}
                                  title={`Count ${count}`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                      isCurrent
                                        ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]"
                                        : "bg-emerald-500/80 hover:bg-emerald-300"
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {!confirmedCountsCollapsed && (
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
                  )}
                </div>
              )}
            </div>

            {/* ユーティリティ（ズーム・ステータス・録画） */}
            <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-3 shadow-xl space-y-3 shrink-0">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                ドリル情報
              </h2>

              {/* ズーム */}
              <div className="space-y-1.5">
                <div className="text-xs text-slate-400/90 uppercase tracking-wider">
                  Zoom
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="px-2.5 py-1.5 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 text-slate-300 hover:text-slate-100 transition-all duration-200 shadow-sm text-sm"
                  >
                    −
                  </button>
                  <span className="flex-1 px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-md text-center text-slate-200 font-medium shadow-inner text-xs">
                    {Math.round(canvasScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="px-2 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    ＋
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className="px-2 py-1 text-[10px] rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* ステータス表示 */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="px-2.5 py-1.5 rounded-md bg-emerald-900/40 border border-emerald-500/60 text-emerald-200 text-center">
                  Members: {isMounted ? members.length : 0}
                </div>
                <div className="px-2.5 py-1.5 rounded-md bg-slate-900/60 border border-slate-600 text-slate-300 text-center">
                  Count: {isMounted ? Math.round(currentCount) : 0}
                </div>
              </div>

              {/* 録画ボタン（最下部に横並び） */}
              <div className="pt-2 mt-1 border-t border-slate-700/60">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={isRecording2D ? handleStopRecording : handleRecord2D}
                    disabled={isRecording3D}
                    className={`flex-1 px-3 py-1.5 text-[11px] rounded-md transition-all duration-200 border shadow-md hover:shadow-lg ${
                      isRecording2D
                        ? "bg-gradient-to-r from-red-700/90 to-red-800/90 hover:from-red-700 hover:to-red-900 text-white border-red-500/70"
                        : "bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white border-red-500/50"
                    } disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:border-slate-600/60 disabled:cursor-not-allowed disabled:shadow-none`}
                    title={
                      isRecording2D
                        ? "2D録画を停止（ESCキーでも停止できます）"
                        : "2D録画（自動的に再生を開始します）"
                    }
                  >
                    {isRecording2D ? "2D録画停止" : "2D録画"}
                  </button>
                  <button
                    onClick={() => setIs3DPreviewOpen(true)}
                    disabled={isRecording2D || isRecording3D}
                    className="flex-1 px-3 py-1.5 text-[11px] rounded-md bg-slate-700/60 hover:bg-slate-700/80 text-slate-100 disabled:bg-slate-800/40 disabled:text-slate-500 disabled:cursor-not-allowed border border-slate-600/60 hover:border-slate-500/80 transition-all duration-200"
                    title="3Dプレビューを開いて録画"
                  >
                    {isRecording3D ? "3D録画中..." : "3Dプレビュー/録画"}
                  </button>
                </div>
              </div>
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
                fileName={musicState.fileName}
                onLoadMusic={loadMusic}
                onPlayMusic={playMusic}
                onStopMusic={stopMusic}
                onAddMarker={addMarker}
                onRemoveMarker={removeMarker}
                onSetBPM={setBPM}
                onSyncCurrentTime={syncCurrentTime}
                currentCount={currentCount}
                playbackBPM={playbackBPM}
                onSetPlaybackBPM={(bpm) => updateSettings({ playbackBPM: bpm })}
              />
            </div>

            {/* 統計・分析パネル（設定で表示/非表示を切り替え可能） */}
            {settings.showStatistics && (
              <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl">
                <StatisticsPanel
                  sets={sets}
                  members={members}
                  playbackBPM={playbackBPM}
                />
              </div>
            )}

            {/* WebM → MP4変換パネル（一時的に非表示：ffmpeg.wasmがNext.js 16/Turbopackと互換性の問題あり） */}
            {/* <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl">
              <VideoConverterPanel />
            </div> */}
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
                  : s.startCount, // 最後のSETを「点」として扱う
              hasInstructions: Boolean(s.instructions?.trim()), // 指示・動き方が入力されているか
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
            onToggleSetAtCount={handleToggleSetAtCount}
            rangeStartCount={playRangeStartCount}
            rangeEndCount={playRangeEndCount}
            onChangeRangeStart={(c: number) =>
              setPlayRangeStartCount(Math.max(0, Math.round(c)))
            }
            onChangeRangeEnd={(c: number) =>
              setPlayRangeEndCount(Math.max(0, Math.round(c)))
            }
            drillTitle={drillTitle}
            onClickDrillTitle={() => setIsMetadataDialogOpen(true)}
          />
        </div>
      </div>

      {/* 保存状態インジケーター */}
      <SaveStatusIndicator
        sets={sets}
        members={members}
        drillTitle={drillTitle}
        drillDataName={drillDataName}
        drillDbId={drillDbId}
        onSaveToDatabase={saveDrillToDatabase}
      />
      </FileDropZone>
    </>
  );
}
