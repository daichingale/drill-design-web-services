// lib/drill/shapeUtils.ts
// 形状作成ユーティリティ関数

import type { WorldPos } from "./types";

/**
 * 円形に配置
 * @param center 中心座標
 * @param radius 半径（メートル）
 * @param count 配置する人数
 * @param startAngle 開始角度（ラジアン、デフォルト0）
 */
export function arrangeCircle(
  center: WorldPos,
  radius: number,
  count: number,
  startAngle: number = 0
): WorldPos[] {
  if (count === 0) return [];
  if (count === 1) return [center];

  const positions: WorldPos[] = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return positions;
}

/**
 * 四角形に配置
 * @param center 中心座標
 * @param width 幅（メートル）
 * @param height 高さ（メートル）
 * @param count 配置する人数
 * @param spacing 間隔（メートル、デフォルト2.0）
 */
export function arrangeRectangle(
  center: WorldPos,
  width: number,
  height: number,
  count: number,
  spacing: number = 2.0
): WorldPos[] {
  if (count === 0) return [];
  if (count === 1) return [center];

  const positions: WorldPos[] = [];

  // グリッドの行数と列数を計算
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const startX = center.x - width / 2;
  const startY = center.y - height / 2;

  let index = 0;
  for (let row = 0; row < rows && index < count; row++) {
    for (let col = 0; col < cols && index < count; col++) {
      const x = startX + (col * width) / (cols - 1 || 1);
      const y = startY + (row * height) / (rows - 1 || 1);
      positions.push({ x, y });
      index++;
    }
  }

  return positions;
}

/**
 * うずまき（スパイラル）に配置
 * @param center 中心座標
 * @param maxRadius 最大半径（メートル）
 * @param count 配置する人数
 * @param turns 回転数（デフォルト2）
 */
export function arrangeSpiral(
  center: WorldPos,
  maxRadius: number,
  count: number,
  turns: number = 2
): WorldPos[] {
  if (count === 0) return [];
  if (count === 1) return [center];

  const positions: WorldPos[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const angle = t * turns * 2 * Math.PI;
    const radius = (maxRadius * t) / Math.sqrt(1 + turns * turns);
    positions.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return positions;
}

/**
 * ボックス（密集した四角形）に配置
 * @param center 中心座標
 * @param width 幅（メートル）
 * @param height 高さ（メートル）
 * @param count 配置する人数
 * @param spacing 間隔（メートル、デフォルト1.5）
 */
export function arrangeBox(
  center: WorldPos,
  width: number,
  height: number,
  count: number,
  spacing: number = 1.5
): WorldPos[] {
  if (count === 0) return [];
  if (count === 1) return [center];

  const positions: WorldPos[] = [];

  // グリッドの行数と列数を計算
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const totalWidth = (cols - 1) * spacing;
  const totalHeight = (rows - 1) * spacing;

  const startX = center.x - totalWidth / 2;
  const startY = center.y - totalHeight / 2;

  let index = 0;
  for (let row = 0; row < rows && index < count; row++) {
    for (let col = 0; col < cols && index < count; col++) {
      const x = startX + col * spacing;
      const y = startY + row * spacing;
      positions.push({ x, y });
      index++;
    }
  }

  return positions;
}

/**
 * 選択されたメンバーを指定された形状に配置
 * @param selectedIds 選択されたメンバーIDの配列
 * @param shapePositions 形状の位置配列
 * @param currentPositions 現在の位置マップ
 */
export function applyShapeToSelected(
  selectedIds: string[],
  shapePositions: WorldPos[],
  currentPositions: Record<string, WorldPos>
): Record<string, WorldPos> {
  const newPositions: Record<string, WorldPos> = { ...currentPositions };

  // 選択されたメンバーの現在位置の中心を計算
  if (selectedIds.length === 0) return newPositions;

  const currentPosArray = selectedIds
    .map((id) => currentPositions[id])
    .filter((p): p is WorldPos => p !== undefined);

  if (currentPosArray.length === 0) return newPositions;

  const center: WorldPos = {
    x:
      currentPosArray.reduce((sum, p) => sum + p.x, 0) /
      currentPosArray.length,
    y:
      currentPosArray.reduce((sum, p) => sum + p.y, 0) /
      currentPosArray.length,
  };

  // 形状の中心を計算
  const shapeCenter: WorldPos = {
    x:
      shapePositions.reduce((sum, p) => sum + p.x, 0) / shapePositions.length,
    y:
      shapePositions.reduce((sum, p) => sum + p.y, 0) / shapePositions.length,
  };

  // 形状を現在の中心に移動
  const offsetX = center.x - shapeCenter.x;
  const offsetY = center.y - shapeCenter.y;

  selectedIds.forEach((id, index) => {
    if (index < shapePositions.length) {
      newPositions[id] = {
        x: shapePositions[index].x + offsetX,
        y: shapePositions[index].y + offsetY,
      };
    }
  });

  return newPositions;
}

/**
 * 選択されたメンバーを回転
 * @param selectedIds 選択されたメンバーIDの配列
 * @param currentPositions 現在の位置マップ
 * @param center 回転の中心
 * @param angle 回転角度（ラジアン）
 */
export function rotateSelected(
  selectedIds: string[],
  currentPositions: Record<string, WorldPos>,
  center: WorldPos,
  angle: number
): Record<string, WorldPos> {
  const newPositions: Record<string, WorldPos> = { ...currentPositions };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  selectedIds.forEach((id) => {
    const pos = currentPositions[id];
    if (!pos) return;

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;

    newPositions[id] = {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  });

  return newPositions;
}

/**
 * 選択されたメンバーをスケール
 * @param selectedIds 選択されたメンバーIDの配列
 * @param currentPositions 現在の位置マップ
 * @param center スケールの中心
 * @param scaleX X方向のスケール
 * @param scaleY Y方向のスケール（省略時はscaleXと同じ）
 */
export function scaleSelected(
  selectedIds: string[],
  currentPositions: Record<string, WorldPos>,
  center: WorldPos,
  scaleX: number,
  scaleY?: number
): Record<string, WorldPos> {
  const newPositions: Record<string, WorldPos> = { ...currentPositions };
  const sy = scaleY ?? scaleX;

  selectedIds.forEach((id) => {
    const pos = currentPositions[id];
    if (!pos) return;

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;

    newPositions[id] = {
      x: center.x + dx * scaleX,
      y: center.y + dy * sy,
    };
  });

  return newPositions;
}

