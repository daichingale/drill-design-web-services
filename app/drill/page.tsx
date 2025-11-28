// app/drill/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useMembers } from "@/context/MembersContext";
import { FIELD_WIDTH_M, FIELD_HEIGHT_M, STEP_M } from "@/lib/drill/utils";

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
  saveDrillToLocalStorage,
  loadDrillFromLocalStorage,
  exportDrillToJSON,
  importDrillFromJSON,
  autoSaveDrill,
} from "@/lib/drill/storage";
import {
  downloadImage,
  exportSetsToPDF,
  printCurrentSet,
} from "@/lib/drill/export";
import { exportSetWithInfo } from "@/lib/drill/imageExport";
import ExportOptionsDialog, { type ExportOptions } from "@/components/drill/ExportOptionsDialog";
import { record2DAnimation, record3DAnimation, downloadVideo } from "@/lib/drill/videoRecorder";
import { useMusicSync } from "@/hooks/useMusicSync";
import MusicSyncPanel from "@/components/drill/MusicSyncPanel";

// UiSet型はlib/drill/uiTypes.tsからインポートするため、ここでは定義しない

type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
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
    handleSelectBulk,
    nudgeSelected,
    restoreState,
  } = useDrillSets(members as any, clampAndSnap);

  // 復元中フラグ（無限ループ防止）
  const isRestoringRef = useRef(false);
  const isInitialLoadRef = useRef(false);
  const lastPushedStateRef = useRef<string>("");

  // 必要に応じて変数名を統一
  const sets = drillSetsSets;
  const currentSetId = drillCurrentSetId;
  const setCurrentSetId = drillSetCurrentSetId;
  const selectedIds = drillSelectedIds;

  // ★ Undo/Redo 管理
  const undoRedo = useUndoRedo<EditorState>({
    sets: drillSetsSets,
    selectedIds: drillSelectedIds,
    currentSetId: drillCurrentSetId,
  });

  // 状態が変わるたびに履歴に積む（復元中は除外）
  useEffect(() => {
    if (isRestoringRef.current || !isInitialLoadRef.current) return;
    
    const stateStr = JSON.stringify({
      sets: drillSetsSets,
      selectedIds: drillSelectedIds,
      currentSetId: drillCurrentSetId,
    });
    
    // 前回と同じ状態ならスキップ
    if (lastPushedStateRef.current === stateStr) return;
    
    lastPushedStateRef.current = stateStr;
    // 少し遅延させて、復元処理が完了してから履歴に積む
    const timer = setTimeout(() => {
      if (!isRestoringRef.current) {
        undoRedo.push({
          sets: drillSetsSets,
          selectedIds: drillSelectedIds,
          currentSetId: drillCurrentSetId,
        });
      }
    }, 50);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillSetsSets, drillSelectedIds, drillCurrentSetId]);

  // Undo/Redo からの復元（undo/redoが呼ばれた時のみ）
  const prevUndoRedoStateStrRef = useRef<string>("");
  const isUndoRedoActionRef = useRef(false);
  
  useEffect(() => {
    const state = undoRedo.state;
    if (!state || state.sets.length === 0) {
      prevUndoRedoStateStrRef.current = "";
      return;
    }
    
    const stateStr = JSON.stringify(state);
    
    // 前回と同じ状態ならスキップ（pushによる変更は無視）
    if (prevUndoRedoStateStrRef.current === stateStr) return;
    
    // 現在の状態と比較
    const currentStateStr = JSON.stringify({
      sets: drillSetsSets,
      selectedIds: drillSelectedIds,
      currentSetId: drillCurrentSetId,
    });
    
    // 現在の状態とundoRedo.stateが異なる場合のみ復元（undo/redoが呼ばれた時）
    if (currentStateStr !== stateStr && !isRestoringRef.current) {
      isRestoringRef.current = true;
      isUndoRedoActionRef.current = true;
      lastPushedStateRef.current = ""; // リセット
      restoreState(state.sets, state.selectedIds, state.currentSetId);
      prevUndoRedoStateStrRef.current = stateStr;
      // 次のレンダリングサイクルでフラグをリセット
      setTimeout(() => {
        isRestoringRef.current = false;
        isUndoRedoActionRef.current = false;
      }, 100);
    } else {
      // 同じ状態なら、次回の比較用に保存
      prevUndoRedoStateStrRef.current = stateStr;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoRedo.state]);

  // ローカルストレージからの読み込み（初回のみ）
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    
    const savedSets = loadDrillFromLocalStorage();
    if (savedSets && savedSets.length > 0) {
      isRestoringRef.current = true;
      lastPushedStateRef.current = ""; // リセット
      restoreState(savedSets, [], savedSets[0]?.id || "");
      setTimeout(() => {
        isRestoringRef.current = false;
        isInitialLoadRef.current = true;
      }, 0);
    } else {
      isInitialLoadRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  // 自動保存（セットが変更されたら2秒後に保存）
  useEffect(() => {
    if (!isInitialLoadRef.current || isRestoringRef.current) return;
    if (drillSetsSets.length > 0) {
      autoSaveDrill(drillSetsSets, 2000);
    }
  }, [drillSetsSets]);

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

  // ドリル再生停止時に音楽も停止
  const handleStopPlay = () => {
    // 録画中の場合、録画も停止
    if (isRecording2D || isRecording3D) {
      shouldStopRecordingRef.current = true;
      console.log("再生停止により録画も停止します");
    }
    
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

  // FieldCanvasのref
  const canvasRef = useRef<FieldCanvasRef>(null);
  // 3Dプレビューのref
  const preview3DRef = useRef<Drill3DPreviewRef>(null);
  // 録画状態
  const [isRecording2D, setIsRecording2D] = useState(false);
  const [isRecording3D, setIsRecording3D] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const shouldStopRecordingRef = useRef(false);
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

  // 保存・読み込み関数
  const handleSave = () => {
    const success = saveDrillToLocalStorage(sets);
    if (success) {
      alert("ドリルデータを保存しました");
    } else {
      alert("保存に失敗しました");
    }
  };

  const handleLoad = () => {
    if (confirm("現在のデータを上書きしますか？")) {
      const savedSets = loadDrillFromLocalStorage();
      if (savedSets && savedSets.length > 0) {
        isRestoringRef.current = true;
        restoreState(savedSets, [], savedSets[0]?.id || "");
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
        alert("ドリルデータを読み込みました");
      } else {
        alert("保存されたデータが見つかりませんでした");
      }
    }
  };

  const handleExportJSON = () => {
    const json = exportDrillToJSON(sets);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drill-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonString = event.target?.result as string;
        const importedSets = importDrillFromJSON(jsonString);
        
        if (importedSets && importedSets.length > 0) {
          if (confirm("現在のデータを上書きしますか？")) {
            isRestoringRef.current = true;
            restoreState(importedSets, [], importedSets[0]?.id || "");
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 0);
            alert("ドリルデータをインポートしました");
          }
        } else {
          alert("インポートに失敗しました。ファイル形式を確認してください。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // エクスポートオプションダイアログの状態
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"image" | "pdf" | "print" | null>(null);
  const [pendingImageFormat, setPendingImageFormat] = useState<"png" | "jpeg">("png");

  // 画像エクスポート（オプション選択後）
  const handleExportImageWithOptions = async (
    format: "png" | "jpeg",
    options: ExportOptions
  ) => {
    if (!canvasRef.current) {
      alert("キャンバスが読み込まれていません");
      return;
    }

    try {
      // フィールド画像を取得
      const fieldBlob = await canvasRef.current.exportImage(format, 2);
      if (!fieldBlob) {
        alert("フィールド画像の取得に失敗しました");
        return;
      }

      // セット情報を含む画像を生成
      const finalBlob = await exportSetWithInfo(
        fieldBlob,
        currentSet,
        options,
        format
      );

      if (finalBlob) {
        const filename = `drill-${currentSet.name || currentSetId}-${new Date().toISOString().split("T")[0]}.${format}`;
        downloadImage(finalBlob, filename);
      } else {
        alert("画像のエクスポートに失敗しました");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("画像のエクスポートに失敗しました");
    }
  };

  // 画像エクスポート（ダイアログを開く）
  const handleExportImage = (format: "png" | "jpeg" = "png") => {
    setPendingImageFormat(format);
    setPendingExportType("image");
    setExportDialogOpen(true);
  };

  // PDFエクスポート（ダイアログを開く）
  const handleExportPDF = (includeAllSets: boolean = false) => {
    setPendingExportType("pdf");
    setExportDialogOpen(true);
  };

  // PDFエクスポート（オプション選択後）
  const handleExportPDFWithOptions = async (
    options: ExportOptions,
    includeAllSets: boolean = false
  ) => {
    if (!canvasRef.current) {
      alert("キャンバスが読み込まれていません");
      return;
    }

    try {
      const getSetImage = async (setId: string): Promise<Blob | null> => {
        // 一時的にそのセットに切り替えて画像を取得
        const targetSet = sets.find((s) => s.id === setId);
        if (!targetSet) return null;

        // 現在のセットを一時的に変更（実際には変更せず、表示のみ変更する方法を検討）
        // 簡易実装：現在のセットのみエクスポート
        if (setId === currentSetId) {
          return await canvasRef.current?.exportImage("png", 2) || null;
        }
        return null;
      };

      await exportSetsToPDF(
        sets,
        members as any,
        currentSetId,
        getSetImage,
        {
          pageSize: "A4",
          orientation: "landscape",
          margin: 10,
          showGrid: true,
          showLabels: true,
          includeAllSets,
          setsPerPage: 1,
        },
        {
          includeSetName: options.includeSetName,
          includeCount: options.includeCount,
          includeNote: options.includeNote,
          includeInstructions: options.includeInstructions,
          includeField: options.includeField,
        }
      );
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDFのエクスポートに失敗しました");
    }
  };

  // エクスポートオプション確定時の処理
  const handleExportOptionsConfirm = (options: ExportOptions) => {
    if (pendingExportType === "image") {
      handleExportImageWithOptions(pendingImageFormat, options);
    } else if (pendingExportType === "pdf") {
      handleExportPDFWithOptions(options, false);
    } else if (pendingExportType === "print") {
      handlePrintWithOptions(options);
    }
    setPendingExportType(null);
  };

  // 印刷（ダイアログを開く）
  const handlePrint = () => {
    setPendingExportType("print");
    setExportDialogOpen(true);
  };

  // 印刷（オプション選択後）
  const handlePrintWithOptions = (options: ExportOptions) => {
    const canvasElement = document.querySelector(".field-canvas-container");
    if (!canvasElement) {
      alert("印刷する要素が見つかりません");
      return;
    }

    printCurrentSet(canvasElement as HTMLElement, currentSet, {
      includeSetName: options.includeSetName,
      includeCount: options.includeCount,
      includeNote: options.includeNote,
      includeInstructions: options.includeInstructions,
      includeField: options.includeField,
    });
  };

  // 2D録画
  const handleRecord2D = async () => {
    if (!canvasRef.current) {
      alert("キャンバスが読み込まれていません");
      return;
    }

    // 録画開始時に再生を開始（まだ再生していない場合）
    const wasPlaying = isPlaying;
    const wasMusicSyncMode = musicState.isLoaded && musicState.markers.length > 0;
    
    // 録画中は音楽同期を無効化（通常速度で録画するため）
    if (wasMusicSyncMode) {
      setMusicSyncMode(false);
    }
    
    if (!wasPlaying) {
      handleStartPlay();
      // 再生開始を待つ（少し長めに待つ）
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // 録画開始前に再生状態を再確認
    if (!isPlaying) {
      alert("再生が開始されていません。録画を開始できません。");
      return;
    }

    setIsRecording2D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true); // 録画中フラグを設定

    // 録画開始時のisPlaying状態を保存（クロージャで使用）
    let recordingIsPlaying = isPlaying;

    try {
      // 停止条件: 録画停止フラグが立つか、音楽が終了する、または再生が停止された
      const shouldStop = () => {
        if (shouldStopRecordingRef.current) {
          console.log("2D録画停止: ユーザーが停止ボタンを押しました");
          return true;
        }
        // 再生が停止された場合も録画を停止（ただし、録画開始直後は除外）
        // recordingIsPlayingを更新（最新のisPlaying状態を取得）
        recordingIsPlaying = isPlaying;
        if (!recordingIsPlaying) {
          console.log("2D録画停止: 再生が停止されました");
          return true;
        }
        // 音楽が終了しているかチェック（音楽同期が有効な場合）
        if (wasMusicSyncMode && musicState.isLoaded && musicState.duration > 0) {
          // 音楽の現在時間がdurationに達しているかチェック（0.5秒のマージン）
          if (musicState.currentTime >= musicState.duration - 0.5) {
            console.log("2D録画停止: 音楽が終了しました", {
              currentTime: musicState.currentTime,
              duration: musicState.duration,
            });
            return true;
          }
        }
        return false;
      };

      const videoBlob = await record2DAnimation(
        () => canvasRef.current?.captureFrame() || Promise.resolve(null),
        shouldStop,
        {
          fps: 30,
          width: 1920,
          height: 1080,
        },
        (progress) => setRecordingProgress(progress)
      );

      // 録画完了後、元々再生していなかった場合は停止
      if (!wasPlaying) {
        stopPlay();
      }

      if (videoBlob) {
        const filename = `drill-2d-${currentSet.name || currentSetId}-${new Date().toISOString().split("T")[0]}.webm`;
        downloadVideo(videoBlob, filename);
        alert("2D録画が完了しました");
      } else {
        alert("2D録画に失敗しました");
      }
    } catch (error) {
      console.error("2D recording error:", error);
      // エラー時も停止
      if (!wasPlaying) {
        stopPlay();
      }
      alert("2D録画に失敗しました");
    } finally {
      setIsRecording2D(false);
      setRecordingProgress(0);
      shouldStopRecordingRef.current = false;
      setRecordingMode(false); // 録画中フラグを解除
      // 録画前の状態に戻す（音楽同期が有効だった場合は復元）
      if (wasMusicSyncMode) {
        setMusicSyncMode(true);
      }
    }
  };

  // 録画停止
  const handleStopRecording = () => {
    shouldStopRecordingRef.current = true;
    console.log("録画停止ボタンが押されました");
  };

  // 3D録画
  const handleRecord3D = async () => {
    if (!preview3DRef.current) {
      alert("3Dプレビューが読み込まれていません");
      return;
    }

    // 再生範囲の長さを計算
    const startSet = sets.find((s) => s.id === playStartId);
    const endSet = sets.find((s) => s.id === playEndId);
    if (!startSet || !endSet) {
      alert("再生範囲が設定されていません");
      return;
    }

    // セットの順序を取得
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const startIndex = sortedSets.findIndex((s) => s.id === playStartId);
    const endIndex = sortedSets.findIndex((s) => s.id === playEndId);
    
    // 終了セットの終了カウントを計算（次のセットの開始カウント、または最後のセットなら+16）
    const endCount = endIndex < sortedSets.length - 1
      ? sortedSets[endIndex + 1].startCount
      : endSet.startCount + 16;
    
    const duration = Math.max(1, (endCount - startSet.startCount) / 16); // 秒単位
    
    console.log("3D録画開始:", {
      startSet: startSet.name,
      endSet: endSet.name,
      startCount: startSet.startCount,
      endCount,
      duration: `${duration.toFixed(2)}秒`,
    });

    // 録画開始時に再生を開始（まだ再生していない場合）
    const wasPlaying = isPlaying;
    const wasMusicSyncMode = musicState.isLoaded && musicState.markers.length > 0;
    
    // 録画中は音楽同期を無効化（通常速度で録画するため）
    if (wasMusicSyncMode) {
      setMusicSyncMode(false);
    }
    
    if (!wasPlaying) {
      handleStartPlay();
      // 再生開始を待つ（少し長めに待つ）
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // 録画開始前に再生状態を再確認
    if (!isPlaying) {
      alert("再生が開始されていません。録画を開始できません。");
      return;
    }

    setIsRecording3D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true); // 録画中フラグを設定

    // 録画開始時のisPlaying状態を保存（クロージャで使用）
    let recordingIsPlaying = isPlaying;

    try {
      // 停止条件: 録画停止フラグが立つか、音楽が終了する、または再生が停止された
      const shouldStop = () => {
        if (shouldStopRecordingRef.current) {
          console.log("3D録画停止: ユーザーが停止ボタンを押しました");
          return true;
        }
        // 再生が停止された場合も録画を停止（ただし、録画開始直後は除外）
        // recordingIsPlayingを更新（最新のisPlaying状態を取得）
        recordingIsPlaying = isPlaying;
        if (!recordingIsPlaying) {
          console.log("3D録画停止: 再生が停止されました");
          return true;
        }
        // 音楽が終了しているかチェック（音楽同期が有効な場合）
        if (wasMusicSyncMode && musicState.isLoaded && musicState.duration > 0) {
          // 音楽の現在時間がdurationに達しているかチェック（0.5秒のマージン）
          if (musicState.currentTime >= musicState.duration - 0.5) {
            console.log("3D録画停止: 音楽が終了しました", {
              currentTime: musicState.currentTime,
              duration: musicState.duration,
            });
            return true;
          }
        }
        return false;
      };

      const videoBlob = await record3DAnimation(
        () => preview3DRef.current?.captureFrame() || Promise.resolve(null),
        shouldStop,
        {
          fps: 30,
          width: 1920,
          height: 1080,
        },
        (progress) => setRecordingProgress(progress)
      );

      // 録画完了後、元々再生していなかった場合は停止
      if (!wasPlaying) {
        stopPlay();
      }

      if (videoBlob) {
        const filename = `drill-3d-${currentSet.name || currentSetId}-${new Date().toISOString().split("T")[0]}.webm`;
        downloadVideo(videoBlob, filename);
        alert("3D録画が完了しました");
      } else {
        alert("3D録画に失敗しました");
      }
    } catch (error) {
      console.error("3D recording error:", error);
      // エラー時も停止
      if (!wasPlaying) {
        stopPlay();
      }
      alert("3D録画に失敗しました");
    } finally {
      setIsRecording3D(false);
      setRecordingProgress(0);
      shouldStopRecordingRef.current = false;
      setRecordingMode(false); // 録画中フラグを解除
      // 録画前の状態に戻す（音楽同期が有効だった場合は復元）
      if (wasMusicSyncMode) {
        setMusicSyncMode(true);
      }
    }
  };

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

      // Ctrl/Cmd + S : 保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl/Cmd + Z : Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoRedo.canUndo) {
          undoRedo.undo();
        }
        return;
      }

      // Ctrl/Cmd + Y または Ctrl/Cmd + Shift + Z : Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (undoRedo.canRedo) {
          undoRedo.redo();
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
    undoRedo,
    handleSave,
    musicState.isLoaded,
    syncCurrentTime,
    currentCount,
  ]);

  return (
    <>
      {/* エクスポートオプションダイアログ */}
      <ExportOptionsDialog
        isOpen={exportDialogOpen}
        onClose={() => {
          setExportDialogOpen(false);
          setPendingExportType(null);
        }}
        onConfirm={handleExportOptionsConfirm}
      />
      <div className="relative min-h-screen bg-slate-900 text-slate-100">
      {/* タイムラインと被らないように下に余白を足す */}
      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4 pb-32">
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
          <div className="flex items-center gap-2">
            {/* 保存・読み込みボタン */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={handleSave}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="保存 (Ctrl+S)"
              >
                保存
              </button>
              <button
                onClick={handleLoad}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="読み込み"
              >
                読み込み
              </button>
              <button
                onClick={handleExportJSON}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="JSONエクスポート"
              >
                エクスポート
              </button>
              <button
                onClick={handleImportJSON}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="JSONインポート"
              >
                インポート
              </button>
            </div>
            {/* エクスポート・印刷ボタン */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => handleExportImage("png")}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="PNG画像としてエクスポート"
              >
                PNG
              </button>
              <button
                onClick={() => handleExportImage("jpeg")}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="JPEG画像としてエクスポート"
              >
                JPEG
              </button>
              <button
                onClick={() => handleExportPDF(false)}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="PDFとしてエクスポート（現在のセット）"
              >
                PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
                title="印刷"
              >
                印刷
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60">
                Members: {members.length}
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/60 border border-slate-600">
                Count: {Math.round(currentCount)}
              </span>
            </div>
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

          {/* 中央（ズーム + Canvas） */}
          <div className="flex-1 space-y-3">
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

              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 field-canvas-container">
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
                />
              </div>
            </div>
          </div>

          {/* 右パネル（動き方・指示 + メンバー情報） */}
          <div className="w-80 shrink-0 space-y-4">
            {/* 動き方・指示パネル */}
            <InstructionsPanel
              instructions={currentSet.instructions || ""}
              onChangeInstructions={handleChangeInstructions}
              setName={currentSet.name}
            />

            {/* メンバー情報パネル */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
              <h2 className="text-xs font-semibold text-slate-300 mb-2">
                メンバー情報
              </h2>
              <DrillSidePanel
                members={members as any}
                selectedIds={selectedIds}
                currentSetPositions={currentSet.positions}
              />
            </div>
          </div>
        </section>

        {/* 3D プレビュー */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 w-[340px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-300">
              3Dプレビュー
            </h2>
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
          <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <Drill3DPreview
              ref={preview3DRef}
              members={members as any}
              positions={displayPositions}
            />
          </div>
        </section>

        {/* 音楽同期パネル */}
        <section className="w-[340px]">
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
        </section>
      </main>

      {/* 🎹 画面下に固定されたタイムライン（DAW風） */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-2">
        <div className="max-w-6xl mx-auto">
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
            onStopPlay={handleStopPlay}
            onAddSetAtCurrent={() => addSetAtCount(currentCount)}
          />
        </div>
      </div>
    </div>
    </>
  );
}
