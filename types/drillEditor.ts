// types/drillEditor.ts
// ドリルエディタで使用する型定義

import type { WorldPos } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";

/**
 * エディタの状態
 */
export type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

/**
 * ライン編集の状態
 */
export type LineEditState = {
  memberIds: string[];
  start: WorldPos;
  end: WorldPos;
} | null;

/**
 * ボックス編集の状態
 */
export type BoxEditState = {
  memberIds: string[];
  cols: number;
  rows: number;
  // 四隅のワールド座標
  tl: WorldPos; // top-left
  tr: WorldPos; // top-right
  br: WorldPos; // bottom-right
  bl: WorldPos; // bottom-left
} | null;

// ドリルエディタで使用する型定義

import type { WorldPos } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";

/**
 * エディタの状態
 */
export type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

/**
 * ライン編集の状態
 */
export type LineEditState = {
  memberIds: string[];
  start: WorldPos;
  end: WorldPos;
} | null;

/**
 * ボックス編集の状態
 */
export type BoxEditState = {
  memberIds: string[];
  cols: number;
  rows: number;
  // 四隅のワールド座標
  tl: WorldPos; // top-left
  tr: WorldPos; // top-right
  br: WorldPos; // bottom-right
  bl: WorldPos; // bottom-left
} | null;

