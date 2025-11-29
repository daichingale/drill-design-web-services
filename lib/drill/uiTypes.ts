// lib/drill/uiTypes.ts
import type { WorldPos } from "./types";

/** Pyware 風 UI 用の Set 型 */
export type UiSet = {
  id: string;
  name: string;               // "Set 1" など
  startCount: number;         // その Set の開始カウント（絶対値）
  positions: Record<string, WorldPos>; // 後方互換性のため残す（startCountでの位置）
  // カウントごとの位置（カウント → メンバーID → 位置）
  // 例: { 5: { "member1": { x: 10, y: 20 } }, 6: { "member1": { x: 15, y: 25 } } }
  positionsByCount?: Record<number, Record<string, WorldPos>>;
  note: string;
  instructions: string;        // セットごとの動き方・指示
  nextMove: string;           // 次の動き（例：８拍で振り付けして、８拍マークタイム）
};
