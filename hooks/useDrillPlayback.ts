// hooks/useDrillPlayback.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { DrillEngine } from "@/lib/drill/engine";
import type { Drill, WorldPos, Member as DrillMember } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";

/** Sets + members から Drill を組み立てる */
function buildDrillFromSets(
  sets: UiSet[],
  members: DrillMember[]
): { drill: Drill; countBySetId: Record<string, number> } {
  const drillMembers: DrillMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    part: m.part,
    color: m.color,
  }));

  const positionsByMember: Record<string, Record<number, WorldPos>> = {};
  const countBySetId: Record<string, number> = {};

  const sorted = [...sets].sort((a, b) => a.startCount - b.startCount);

  let maxCount = 0;

  // ★ 以前は先頭セットが 0 の場合に +1 シフトしていたが、
  //    UI とエンジンのカウントを完全に一致させるため、そのロジックは廃止する。
  const baseOffset = 0;

  sorted.forEach((set) => {
    // UI 上の startCount を丸めて使用（0 カウントもそのまま扱う）
    const mappedCount = Math.max(0, Math.round(set.startCount) + baseOffset);
    countBySetId[set.id] = mappedCount;

    // startCountでの位置を追加（後方互換性のため）
    drillMembers.forEach((m) => {
      const p = set.positions[m.id];
      if (!p) return;
      if (!positionsByMember[m.id]) positionsByMember[m.id] = {};
      positionsByMember[m.id][mappedCount] = { x: p.x, y: p.y };
    });

    // positionsByCountからも位置を追加
    if (set.positionsByCount) {
      Object.entries(set.positionsByCount).forEach(([countStr, memberPositions]) => {
        const count = Number(countStr);
        const mappedCountForPosition = Math.max(0, Math.round(count) + baseOffset);
        
        Object.entries(memberPositions).forEach(([memberId, pos]) => {
          if (!positionsByMember[memberId]) positionsByMember[memberId] = {};
          positionsByMember[memberId][mappedCountForPosition] = { x: pos.x, y: pos.y };
        });
        
        if (mappedCountForPosition > maxCount) maxCount = mappedCountForPosition;
      });
    }

    if (mappedCount > maxCount) maxCount = mappedCount;
  });

  const defaultMax = 512; // UI 上のデフォルト最大カウント

  const drill: Drill = {
    id: "from-sets",
    title: "From UI Sets",
    bpm: 144,
    // SET は「点」なので末尾に余計な +16 は付けない。
    // ただしタイムラインのデフォルト長 512 は確保しておく。
    maxCount: Math.max(defaultMax, maxCount),
    members: drillMembers,
    positionsByMember,
  };


  return { drill, countBySetId };
}

type UseDrillPlaybackResult = {
  currentCount: number;
  isPlaying: boolean;
  playbackPositions: Record<string, WorldPos>;
  handleScrub: (count: number) => void;
  startPlayBySetId: (startSetId: string, endSetId: string) => void;
  startPlayByCountRange: (startCount: number, endCount: number) => void;
  stopPlay: () => void;
  clearPlaybackView: () => void;
  setRecordingMode: (recording: boolean) => void; // 録画中フラグ
  setCountFromMusic: (count: number) => void; // 音楽からカウントを設定
  setMusicSyncMode: (enabled: boolean) => void; // 音楽同期モード
};

export function useDrillPlayback(
  sets: UiSet[],
  members: DrillMember[],
  playbackBPM: number = 120, // デフォルトはBPM=120（1秒で2カウント）
  loopRangeEnabled: boolean = false
): UseDrillPlaybackResult {
  const [currentCount, setCurrentCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPositions, setPlaybackPositions] = useState<
    Record<string, WorldPos>
  >({});

  const engineRef = useRef<DrillEngine | null>(null);
  const countBySetRef = useRef<Record<string, number>>({});
  const playRangeRef = useRef<{ startCount: number; endCount: number } | null>(
    null
  );
  const isRecordingRef = useRef(false);
  const musicSyncModeRef = useRef(false); // 音楽同期モード

  // BPMからcountsPerSecondを計算（1拍 = 2カウントと仮定）
  // BPM = 120の場合: 120拍/分 = 2拍/秒 = 4カウント/秒
  // ただし、一般的には1拍 = 1カウントとして扱うことが多いので、BPM = 120の場合: 120拍/分 = 2拍/秒 = 2カウント/秒
  const countsPerSecond = playbackBPM / 60; // 1秒あたりの拍数 = 1秒あたりのカウント数（1拍 = 1カウント）

  // Drill 再構築
  useEffect(() => {
    // セットが存在しないときだけスキップ。
    // メンバーが 0 人でも、カウント軸だけ先に動かせるようにエンジンは構築する。
    if (!sets.length) return;

    const { drill, countBySetId } = buildDrillFromSets(sets, members);
    countBySetRef.current = countBySetId;

    // 既存のエンジンがある場合、現在のカウントを保存
    const currentCount = engineRef.current?.currentCount ?? 0;
    const wasPlaying = engineRef.current?.isPlaying() ?? false;

    // BPMに基づいてcountsPerSecondを設定
    engineRef.current = new DrillEngine(drill, countsPerSecond);
    
    // 既存のカウントを復元
    if (currentCount > 0) {
      engineRef.current.setCount(currentCount);
    }
    
    // 再生中だった場合は再開
    if (wasPlaying) {
      engineRef.current.play();
    }
  }, [sets, members, countsPerSecond]);

  // アニメーションループ
  useEffect(() => {
    let frameId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const engine = engineRef.current;

      if (engine && isPlaying) {
        // 音楽同期モードの場合は、エンジンの自動更新をスキップ
        // （カウントは音楽から直接設定される）
        if (!musicSyncModeRef.current) {
          // 負の dt や異常な値は無視
          if (dt > 0) {
            engine.update(dt);
            const positions = engine.getCurrentPositionsMap();
            setPlaybackPositions(positions);
            setCurrentCount(engine.currentCount);
          }
        }

        const range = playRangeRef.current;
        // 録画中は自動停止しない
        if (
          range &&
          engine.currentCount >= range.endCount &&
          !isRecordingRef.current &&
          !musicSyncModeRef.current
        ) {
          if (loopRangeEnabled) {
            // ループレンジ: 終了カウントに到達したら開始カウントに戻して再生継続
            engine.setCount(range.startCount);
            const loopPositions = engine.getCurrentPositionsMap();
            setCurrentCount(range.startCount);
            setPlaybackPositions(loopPositions);
          } else {
            // 通常レンジ: 終了カウントに到達したら停止
            engine.pause();
            setIsPlaying(false);
            playRangeRef.current = null;
            setPlaybackPositions({});
          }
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, loopRangeEnabled]);

  // スクラブ（ドラッグで動かす）
  const handleScrub = (count: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    // DrillEngine 内部で Drill.maxCount にクランプされるので、ここでは 0 以上だけ保証する
    const clamped = Math.max(0, count);
    engine.setCount(clamped);
    const positions = engine.getCurrentPositionsMap();
    setIsPlaying(false);
    playRangeRef.current = null;
    setCurrentCount(clamped);
    setPlaybackPositions(positions);
  };

  // 再生ビューだけ解除（編集に戻る用）
  const clearPlaybackView = () => {
    setPlaybackPositions({});
    setIsPlaying(false);
    playRangeRef.current = null;
  };

  // カウント指定で再生開始
  const startPlayInternal = (startCount: number, endCount: number) => {
    const engine = engineRef.current;
    if (!engine) {
      alert("ドリルデータがまだ準備できていません");
      return;
    }

    if (startCount >= endCount) {
      alert("開始カウントは終了カウントより前にしてください");
      return;
    }

    playRangeRef.current = { startCount, endCount };
    engine.setCount(startCount);
    setCurrentCount(startCount);
    engine.play();
    setIsPlaying(true);
  };

  // 任意のカウント範囲から再生
  const startPlayByCountRange = (startCount: number, endCount: number) => {
    startPlayInternal(startCount, endCount);
  };

  // Set ID から再生
  const startPlayBySetId = (startSetId: string, endSetId: string) => {
    if (!sets.length) return;

    const map = countBySetRef.current;
    const startCount = map[startSetId];
    const endCount = map[endSetId];

    if (startCount === undefined || endCount === undefined) {
      alert("セットのカウント情報が見つかりませんでした");
      return;
    }

    const fixedEnd = Math.max(startCount + 1, endCount);

    startPlayInternal(startCount, fixedEnd);
  };

  const stopPlay = () => {
    const engine = engineRef.current;
    if (engine) engine.pause();
    playRangeRef.current = null;
    setIsPlaying(false);
    setPlaybackPositions({});
  };

  const setRecordingMode = (recording: boolean) => {
    isRecordingRef.current = recording;
  };

  // 音楽からカウントを設定（音楽同期モード用）
  const setCountFromMusic = (count: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    engine.setCount(count);
    const positions = engine.getCurrentPositionsMap();
    setPlaybackPositions(positions);
    setCurrentCount(count);
  };

  // 音楽同期モードを設定
  const setMusicSyncMode = (enabled: boolean) => {
    musicSyncModeRef.current = enabled;
  };

  return {
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
  };
}
