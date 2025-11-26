// hooks/useDrillPlayback.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { DrillEngine } from "@/lib/drill/engine";
import type {
  Drill,
  WorldPos,
  Member as DrillMember,
} from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";

/** Sets + members から Drill を組み立てる */
function buildDrillFromSets(
  sets: UiSet[],
  members: DrillMember[]
): { drill: Drill; maxCount: number } {
  const drillMembers: DrillMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    part: m.part,
    color: m.color,
  }));

  const positionsByMember: Record<string, Record<number, WorldPos>> = {};

  const sorted = [...sets].sort((a, b) => a.startCount - b.startCount);

  let maxStartCount = 0;

  sorted.forEach((set) => {
    const count = Math.max(0, Math.round(set.startCount));
    if (count > maxStartCount) maxStartCount = count;

    drillMembers.forEach((m) => {
      const p = set.positions[m.id];
      if (!p) return;
      if (!positionsByMember[m.id]) positionsByMember[m.id] = {};
      positionsByMember[m.id][count] = { x: p.x, y: p.y };
    });
  });

  const maxCount = maxStartCount + 16; // 最後のセットから16カウント分は最低動けるように

  const drill: Drill = {
    id: "from-sets",
    title: "From UI Sets",
    bpm: 144,
    maxCount,
    members: drillMembers,
    positionsByMember,
  };

  return { drill, maxCount };
}

type UseDrillPlaybackResult = {
  currentCount: number;
  isPlaying: boolean;
  playbackPositions: Record<string, WorldPos>;
  handleScrub: (count: number) => void;
  startPlay: (startCount: number, endCount: number) => void;
  stopPlay: () => void;
};

export function useDrillPlayback(
  sets: UiSet[],
  members: DrillMember[]
): UseDrillPlaybackResult {
  const [currentCount, setCurrentCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPositions, setPlaybackPositions] = useState<
    Record<string, WorldPos>
  >({});

  const engineRef = useRef<DrillEngine | null>(null);
  const maxCountRef = useRef<number>(0);
  const playRangeRef = useRef<{ startCount: number; endCount: number } | null>(
    null
  );

  // Drill 再構築
  useEffect(() => {
    if (!members.length || !sets.length) return;

    const { drill, maxCount } = buildDrillFromSets(sets, members);
    maxCountRef.current = maxCount;

    if (!engineRef.current) {
      engineRef.current = new DrillEngine(drill, 16);
    } else {
      engineRef.current.setDrill(drill);
    }

    // スクラブされていなければ、とりあえず先頭に合わせておく
    engineRef.current.setCount(0);
    const positions = engineRef.current.getCurrentPositionsMap();
    setPlaybackPositions(positions);
    setCurrentCount(0);
  }, [sets, members]);

  // アニメーションループ
  useEffect(() => {
    let frameId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const engine = engineRef.current;

      if (engine && isPlaying) {
        engine.update(dt);

        const positions = engine.getCurrentPositionsMap();
        setPlaybackPositions(positions);
        setCurrentCount(engine.currentCount);

        const range = playRangeRef.current;
        if (range && engine.currentCount >= range.endCount) {
          engine.pause();
          setIsPlaying(false);
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // スクラブ（ドラッグでカウント移動）
  const handleScrub = (count: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    const max = maxCountRef.current || engine["drill"]?.maxCount || 0;
    const clamped = Math.min(Math.max(count, 0), max);

    engine.setCount(clamped);
    const positions = engine.getCurrentPositionsMap();

    setIsPlaying(false);
    setCurrentCount(engine.currentCount);
    setPlaybackPositions(positions);
  };

  // 再生開始 / 停止（ここが今回の本丸）
  const startPlay = (startCount: number, endCount: number) => {
    const engine = engineRef.current;
    if (!engine) {
      alert("ドリルデータがまだ準備できていません");
      return;
    }
    if (sets.length < 2) {
      alert("アニメーションには最低2セット必要です");
      return;
    }

    if (!Number.isFinite(startCount) || !Number.isFinite(endCount)) {
      alert("開始 / 終了カウントの値が不正です");
      return;
    }

    const max = maxCountRef.current || endCount;
    let s = Math.min(Math.max(startCount, 0), max);
    let e = Math.min(Math.max(endCount, 0), max);

    if (e <= s) {
      e = Math.min(s + 1, max); // 少なくとも1カウントは進む
    }

    console.log("startPlay:", { startCount: s, endCount: e });

    playRangeRef.current = { startCount: s, endCount: e };

    engine.setCount(s);
    const positions = engine.getCurrentPositionsMap();
    setPlaybackPositions(positions);
    setCurrentCount(engine.currentCount);

    engine.play();
    setIsPlaying(true);
  };

  const stopPlay = () => {
    const engine = engineRef.current;
    if (engine) engine.pause();
    playRangeRef.current = null;
    setIsPlaying(false);
  };

  return {
    currentCount,
    isPlaying,
    playbackPositions,
    handleScrub,
    startPlay,
    stopPlay,
  };
}
