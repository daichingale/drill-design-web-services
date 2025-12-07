// lib/drill/math.ts
// 数学的ユーティリティ関数

import type { WorldPos } from "./types";

/**
 * 2点間の距離を計算（メートル）
 */
export function calculateDistance(pos1: WorldPos, pos2: WorldPos): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
