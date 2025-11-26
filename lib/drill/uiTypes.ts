// lib/drill/uiTypes.ts
import type { WorldPos } from "./types";

/** Pyware 風 UI 用の Set 型 */
export type UiSet = {
  id: string;
  name: string;               // "Set 1" など
  startCount: number;         // その Set の開始カウント（絶対値）
  positions: Record<string, WorldPos>;
  note: string;
};
