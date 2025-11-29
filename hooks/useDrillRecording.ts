// hooks/useDrillRecording.ts
"use client";

import { useState, useRef, useCallback } from "react";
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
  handleStartPlay: () => void;
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
  handleStartPlay,
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

  const handleRecord2D = useCallback(async () => {
    if (!canvasRef.current) {
      alert("キャンバスが読み込まれていません");
      return;
    }

    const wasPlaying = isPlaying;
    const wasMusicSyncMode = musicState.isLoaded && musicState.markers.length > 0;
    
    if (wasMusicSyncMode) {
      setMusicSyncMode(false);
    }
    
    if (!wasPlaying) {
      handleStartPlay();
      let waitCount = 0;
      const maxWait = 20;
      while (!isPlaying && waitCount < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (!isPlaying && wasMusicSyncMode && musicState.isLoaded && musicState.isPlaying) {
        console.log("2D録画: 音楽同期モード - 音楽が再生されているため録画を開始します");
      } else if (!isPlaying) {
        alert("再生が開始されていません。録画を開始できません。");
        return;
      }
    }

    setIsRecording2D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true);

    let recordingIsPlaying = isPlaying;

    try {
      const shouldStop = () => {
        if (shouldStopRecordingRef.current) {
          console.log("2D録画停止: ユーザーが停止ボタンを押しました");
          return true;
        }
        recordingIsPlaying = isPlaying;
        if (!recordingIsPlaying) {
          console.log("2D録画停止: 再生が停止されました");
          return true;
        }
        if (wasMusicSyncMode && musicState.isLoaded && musicState.duration > 0) {
          if (musicState.currentTime >= musicState.duration - 0.5) {
            console.log("2D録画停止: 音楽が終了しました");
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
      if (wasMusicSyncMode) {
        setMusicSyncMode(true);
      }
    }
  }, [
    canvasRef,
    currentSet,
    currentSetId,
    isPlaying,
    musicState,
    setMusicSyncMode,
    setRecordingMode,
    handleStartPlay,
    stopPlay,
  ]);

  const handleRecord3D = useCallback(async () => {
    if (!preview3DRef.current) {
      alert("3Dプレビューが読み込まれていません");
      return;
    }

    const startSet = sets.find((s) => s.id === playStartId);
    const endSet = sets.find((s) => s.id === playEndId);
    if (!startSet || !endSet) {
      alert("再生範囲が設定されていません");
      return;
    }

    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const startIndex = sortedSets.findIndex((s) => s.id === playStartId);
    const endIndex = sortedSets.findIndex((s) => s.id === playEndId);
    
    const endCount = endIndex < sortedSets.length - 1
      ? sortedSets[endIndex + 1].startCount
      : endSet.startCount + 16;
    
    const duration = Math.max(1, (endCount - startSet.startCount) / 16);

    const wasPlaying = isPlaying;
    const wasMusicSyncMode = musicState.isLoaded && musicState.markers.length > 0;
    
    if (wasMusicSyncMode) {
      setMusicSyncMode(false);
    }
    
    if (!wasPlaying) {
      handleStartPlay();
      let waitCount = 0;
      const maxWait = 20;
      while (!isPlaying && waitCount < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (!isPlaying && wasMusicSyncMode && musicState.isLoaded && musicState.isPlaying) {
        console.log("3D録画: 音楽同期モード - 音楽が再生されているため録画を開始します");
      } else if (!isPlaying) {
        alert("再生が開始されていません。録画を開始できません。");
        return;
      }
    }

    setIsRecording3D(true);
    setRecordingProgress(0);
    shouldStopRecordingRef.current = false;
    setRecordingMode(true);

    let recordingIsPlaying = isPlaying;

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
        if (wasMusicSyncMode && musicState.isLoaded && musicState.duration > 0) {
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
      if (wasMusicSyncMode) {
        setMusicSyncMode(true);
      }
    }
  }, [
    preview3DRef,
    sets,
    playStartId,
    playEndId,
    currentSet,
    currentSetId,
    isPlaying,
    musicState,
    setMusicSyncMode,
    setRecordingMode,
    handleStartPlay,
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

