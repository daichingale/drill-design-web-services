// hooks/useDrillRecording.ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { FieldCanvasRef } from "@/components/drill/FieldCanvas";
import type { Drill3DPreviewRef } from "@/components/drill/Drill3DPreview";
import type { UiSet } from "@/lib/drill/uiTypes";
import { record2DAnimation, record3DAnimation, downloadVideo } from "@/lib/drill/videoRecorder";
import type { MusicSyncState } from "@/hooks/useMusicSync";

type UseDrillRecordingParams = {
  canvasRef: React.RefObject<FieldCanvasRef | null>;
  preview3DRef: React.RefObject<Drill3DPreviewRef | null>;
  currentSet: UiSet;
  currentSetId: string;
  sets: UiSet[];
  playStartId: string;
  playEndId: string;
  isPlaying: boolean;
  musicState: MusicSyncState;
  setMusicSyncMode: (enabled: boolean) => void;
  setRecordingMode: (recording: boolean) => void;
  startPlayByCountRange: (startCount: number, endCount: number) => void;
  playMusic: () => void;
  getMusicTimeFromCount: (count: number) => number | null;
  setCountFromMusic: (count: number) => void;
  stopPlay: () => void;
};

export function useDrillRecording({
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
}: UseDrillRecordingParams) {
  const [isRecording2D, setIsRecording2D] = useState(false);
  const [isRecording3D, setIsRecording3D] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const shouldStopRecordingRef = useRef(false);

  const handleStopRecording = useCallback(() => {
    shouldStopRecordingRef.current = true;
    console.log("録画停止ボタンが押されました");
  }, []);

  // ESC キーで録画停止できるようにする
  useEffect(() => {
    if (!isRecording2D && !isRecording3D) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        shouldStopRecordingRef.current = true;
        console.log("録画停止: ESCキーが押されました");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRecording2D, isRecording3D]);

  const handleRecord2D = useCallback(async () => {
    if (!canvasRef.current) {
      alert("キャンバスが読み込まれていません");
      return;
    }

    if (!sets.length) {
      alert("セットが設定されていません");
      return;
    }

    const wasPlaying = isPlaying;
    const wasMusicPlaying = musicState.isPlaying;
    const hasMusicSync = musicState.isLoaded && musicState.markers.length > 0;

    // 録画開始時は常に count 0 から動きを開始
    // 最大カウントを計算（最後のセットの startCount + 余裕を持たせる）
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const maxCount = Math.max(512, sortedSets[sortedSets.length - 1]?.startCount || 512);

    // 音楽同期モードの設定
    if (hasMusicSync) {
      // 音楽同期モード: 動きは count 0 から開始し、音楽の時間からカウントを更新
      const musicTime = getMusicTimeFromCount(0);
      if (musicTime !== null) {
        // 音楽が既に再生されていればそのまま、再生されていなければ開始
        if (!wasMusicPlaying) {
          playMusic();
        }
        setMusicSyncMode(true);
        // 動きは count 0 から開始（音楽からカウントを更新する処理は useEffect で自動実行される）
        startPlayByCountRange(0, maxCount);
        // 音楽時間からカウント 0 を設定
        setCountFromMusic(0);
      } else {
        // マーカー範囲外の場合は通常モード
        setMusicSyncMode(false);
        if (musicState.isLoaded && !wasMusicPlaying) {
          playMusic();
        }
        startPlayByCountRange(0, maxCount);
      }
    } else {
      // 通常モード: BPMベースでエンジンがカウントを進める
      setMusicSyncMode(false);
      if (musicState.isLoaded && !wasMusicPlaying) {
        playMusic();
      }
      startPlayByCountRange(0, maxCount);
    }

    setIsRecording2D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true);

    try {
      const shouldStop = () => {
        if (shouldStopRecordingRef.current) {
          console.log("2D録画停止: ユーザーが停止ボタンまたはESCを押しました");
          return true;
        }
        // 自動停止条件は設けず、明示的な停止操作のみで録画を終了する
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
        (progress) => setRecordingProgress(progress),
        musicState.audioStream ?? null
      );

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
      if (!wasPlaying) {
        stopPlay();
      }
      alert("2D録画に失敗しました");
    } finally {
      setIsRecording2D(false);
      setRecordingProgress(0);
      shouldStopRecordingRef.current = false;
      setRecordingMode(false);
    }
  }, [
    canvasRef,
    currentSet,
    currentSetId,
    sets,
    isPlaying,
    musicState,
    setMusicSyncMode,
    setRecordingMode,
    startPlayByCountRange,
    playMusic,
    getMusicTimeFromCount,
    setCountFromMusic,
    stopPlay,
  ]);

  const handleRecord3D = useCallback(async () => {
    if (!preview3DRef.current) {
      alert("3Dプレビューが読み込まれていません");
      return;
    }

    if (!sets.length) {
      alert("セットが設定されていません");
      return;
    }

    const wasPlaying = isPlaying;
    const wasMusicPlaying = musicState.isPlaying;
    const hasMusicSync = musicState.isLoaded && musicState.markers.length > 0;

    // 録画開始時は常に count 0 から動きを開始
    // 最大カウントを計算（最後のセットの startCount + 余裕を持たせる）
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const maxCount = Math.max(512, sortedSets[sortedSets.length - 1]?.startCount || 512);

    // 音楽同期モードの設定
    if (hasMusicSync) {
      // 音楽同期モード: 動きは count 0 から開始し、音楽の時間からカウントを更新
      const musicTime = getMusicTimeFromCount(0);
      if (musicTime !== null) {
        // 音楽が既に再生されていればそのまま、再生されていなければ開始
        if (!wasMusicPlaying) {
          playMusic();
        }
        setMusicSyncMode(true);
        // 動きは count 0 から開始（音楽からカウントを更新する処理は useEffect で自動実行される）
        startPlayByCountRange(0, maxCount);
        // 音楽時間からカウント 0 を設定
        setCountFromMusic(0);
      } else {
        // マーカー範囲外の場合は通常モード
        setMusicSyncMode(false);
        if (musicState.isLoaded && !wasMusicPlaying) {
          playMusic();
        }
        startPlayByCountRange(0, maxCount);
      }
    } else {
      // 通常モード: BPMベースでエンジンがカウントを進める
      setMusicSyncMode(false);
      if (musicState.isLoaded && !wasMusicPlaying) {
        playMusic();
      }
      startPlayByCountRange(0, maxCount);
    }

    setIsRecording3D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true);

    let recordingIsPlaying = isPlaying;
    const recordingHasMusicSync = hasMusicSync;

    try {
      const shouldStop = () => {
        if (shouldStopRecordingRef.current) {
          console.log("3D録画停止: ユーザーが停止ボタンを押しました");
          return true;
        }
        recordingIsPlaying = isPlaying;
        if (!recordingIsPlaying) {
          console.log("3D録画停止: 再生が停止されました");
          return true;
        }
        if (recordingHasMusicSync && musicState.isLoaded && musicState.duration > 0) {
          if (musicState.currentTime >= musicState.duration - 0.5) {
            console.log("3D録画停止: 音楽が終了しました");
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
      if (!wasPlaying) {
        stopPlay();
      }
      alert("3D録画に失敗しました");
    } finally {
      setIsRecording3D(false);
      setRecordingProgress(0);
      shouldStopRecordingRef.current = false;
      setRecordingMode(false);
      if (recordingHasMusicSync) {
        setMusicSyncMode(true);
      }
    }
  }, [
    preview3DRef,
    sets,
    currentSet,
    currentSetId,
    isPlaying,
    musicState,
    setMusicSyncMode,
    setRecordingMode,
    startPlayByCountRange,
    playMusic,
    getMusicTimeFromCount,
    setCountFromMusic,
    stopPlay,
  ]);

  return {
    isRecording2D,
    isRecording3D,
    recordingProgress,
    handleRecord2D,
    handleRecord3D,
    handleStopRecording,
  };
}


