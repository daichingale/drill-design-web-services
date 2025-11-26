// lib/drill/utils.ts

import type { WorldPos, Drill, Member } from "./types";

// ===== フィールド仕様（マーチング基準） =====

// 横 50m, 縦 40m
export const FIELD_WIDTH_M = 50;
export const FIELD_HEIGHT_M = 40;

// 5m を 8歩 → 1歩(1ステップ) = 0.625m
export const STEP_M = 5 / 8;

// 歩数にスナップさせる（ドラッグしたときのスナップ用に）
export function snapToStep(pos: WorldPos): WorldPos {
  return {
    x: Math.round(pos.x / STEP_M) * STEP_M,
    y: Math.round(pos.y / STEP_M) * STEP_M,
  };
}

// 簡単なサンプルドリル（とりあえず動かしたいとき用）
export function createSampleDrill(): Drill {
  const members: Member[] = [
    { id: "m1", name: "Flute 1", part: "Flute", color: "#ff7675" },
    { id: "m2", name: "Trumpet 1", part: "Trumpet", color: "#74b9ff" },
  ];

  const positionsByMember: Drill["positionsByMember"] = {
    m1: {
      0: { x: 10, y: 10 },
      16: { x: 20, y: 10 },
      32: { x: 30, y: 15 },
    },
    m2: {
      0: { x: 10, y: 20 },
      16: { x: 20, y: 25 },
      32: { x: 30, y: 30 },
    },
  };

  return {
    id: "sample-1",
    title: "Sample Drill",
    bpm: 144,
    maxCount: 64,
    members,
    positionsByMember,
  };
}
