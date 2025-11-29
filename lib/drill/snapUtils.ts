// lib/drill/snapUtils.ts

import type { WorldPos } from "./types";
import { STEP_M } from "./utils";

export type SnapMode = "whole" | "half" | "free";

/**
 * ワールド座標をスナップする
 */
export function snapWorld(pos: WorldPos, snapMode: SnapMode): WorldPos {
  if (snapMode === "free") return pos;

  const division = snapMode === "whole" ? 1 : 2;
  const step = STEP_M / division;

  const sx = Math.round(pos.x / step) * step;
  const sy = Math.round(pos.y / step) * step;

  return { x: sx, y: sy };
}

/**
 * ワールド座標をフィールド内に収め、スナップする
 */
export function clampAndSnap(
  pos: WorldPos,
  snapMode: SnapMode,
  fieldWidth: number,
  fieldHeight: number
): WorldPos {
  const snapped = snapWorld(pos, snapMode);
  return {
    x: Math.min(Math.max(snapped.x, 0), fieldWidth),
    y: Math.min(Math.max(snapped.y, 0), fieldHeight),
  };
}

