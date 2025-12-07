// components/drill/PathVisualization.tsx
"use client";

import { useMemo, useState } from "react";
import { Stage, Layer, Line, Circle, Group } from "react-konva";
import Konva from "konva";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { WorldPos } from "@/lib/drill/types";
import { useSettings } from "@/context/SettingsContext";

type PathPoint = {
  count: number;
  position: WorldPos;
  isIntermediate?: boolean; // 中間点かどうか
};

type PathVisualizationProps = {
  sets: UiSet[];
  members: Member[];
  selectedMemberIds: string[];
  showPaths: boolean;
  showCollisions: boolean;
  smoothingEnabled: boolean;
  onAddIntermediatePoint?: (memberId: string, count: number, position: WorldPos) => void;
  onRemoveIntermediatePoint?: (memberId: string, count: number) => void;
  fieldWidth: number;
  fieldHeight: number;
  scale: number;
};

const CANVAS_WIDTH_PX = 700;
const CANVAS_HEIGHT_PX = 700;

// ワールド座標をキャンバス座標に変換
function worldToCanvas(worldPos: WorldPos, fieldWidth: number, fieldHeight: number): { x: number; y: number } {
  const canvasX = (worldPos.x / fieldWidth) * CANVAS_WIDTH_PX;
  const canvasY = (worldPos.y / fieldHeight) * CANVAS_HEIGHT_PX;
  return { x: canvasX, y: canvasY };
}

// セット間のパスを計算
function calculatePath(
  sets: UiSet[],
  memberId: string,
  smoothingEnabled: boolean
): PathPoint[] {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const path: PathPoint[] = [];

  sortedSets.forEach((set) => {
    const pos = set.positions[memberId];
    if (pos) {
      path.push({
        count: set.startCount,
        position: pos,
        isIntermediate: false,
      });
    }

    // positionsByCountからも中間点を追加
    if (set.positionsByCount) {
      Object.entries(set.positionsByCount).forEach(([countStr, memberPositions]) => {
        const count = Number(countStr);
        const memberPos = memberPositions[memberId];
        if (memberPos && count !== set.startCount) {
          path.push({
            count,
            position: memberPos,
            isIntermediate: true,
          });
        }
      });
    }
  });

  // カウント順にソート
  path.sort((a, b) => a.count - b.count);

  // スムージング（簡易実装：線形補間）
  if (smoothingEnabled && path.length > 2) {
    // ここでは単純に既存のパスを使用（実際のスムージングは別途実装）
    return path;
  }

  return path;
}

// 衝突検知
function detectCollisions(
  sets: UiSet[],
  members: Member[],
  selectedMemberIds: string[]
): Array<{
  count: number;
  member1: string;
  member2: string;
  position1: WorldPos;
  position2: WorldPos;
  distance: number;
}> {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const collisions: Array<{
    count: number;
    member1: string;
    member2: string;
    position1: WorldPos;
    position2: WorldPos;
    distance: number;
  }> = [];
  const SAFE_DISTANCE = 1.25; // 2ステップ = 1.25m

  sortedSets.forEach((set) => {
    const selectedPositions: Array<{ memberId: string; position: WorldPos }> = [];
    
    selectedMemberIds.forEach((memberId) => {
      const pos = set.positions[memberId];
      if (pos) {
        selectedPositions.push({ memberId, position: pos });
      }
    });

    for (let i = 0; i < selectedPositions.length; i++) {
      for (let j = i + 1; j < selectedPositions.length; j++) {
        const pos1 = selectedPositions[i].position;
        const pos2 = selectedPositions[j].position;
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < SAFE_DISTANCE) {
          collisions.push({
            count: set.startCount,
            member1: selectedPositions[i].memberId,
            member2: selectedPositions[j].memberId,
            position1: pos1,
            position2: pos2,
            distance,
          });
        }
      }
    }
  });

  return collisions;
}

export default function PathVisualization({
  sets,
  members,
  selectedMemberIds,
  showPaths,
  showCollisions,
  smoothingEnabled,
  onAddIntermediatePoint,
  onRemoveIntermediatePoint,
  fieldWidth,
  fieldHeight,
  scale,
}: PathVisualizationProps) {
  const { settings } = useSettings();

  // 選択メンバーのパスを計算
  const paths = useMemo(() => {
    if (!showPaths || selectedMemberIds.length === 0) return [];
    
    return selectedMemberIds.map((memberId) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return null;
      
      return {
        memberId,
        memberName: member.name,
        memberColor: member.color || "#888888",
        points: calculatePath(sets, memberId, smoothingEnabled),
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [sets, members, selectedMemberIds, showPaths, smoothingEnabled]);

  // 衝突を検出
  const collisions = useMemo(() => {
    if (!showCollisions || selectedMemberIds.length < 2) return [];
    return detectCollisions(sets, members, selectedMemberIds);
  }, [sets, members, selectedMemberIds, showCollisions]);

  if (!showPaths && !showCollisions) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: CANVAS_WIDTH_PX * scale,
        height: CANVAS_HEIGHT_PX * scale,
        pointerEvents: "none",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <Stage
        width={CANVAS_WIDTH_PX}
        height={CANVAS_HEIGHT_PX}
        style={{ pointerEvents: "auto" }}
      >
        <Layer>
          {/* パスの描画 */}
          {showPaths && paths.map((path) => {
            if (path.points.length < 2) return null;

            const canvasPoints: number[] = [];
            path.points.forEach((point) => {
              const canvas = worldToCanvas(point.position, fieldWidth, fieldHeight);
              canvasPoints.push(canvas.x, canvas.y);
            });

            return (
              <Group key={path.memberId}>
                {/* パスライン */}
                <Line
                  points={canvasPoints}
                  stroke={path.memberColor}
                  strokeWidth={8}
                  opacity={0}
                  lineCap="round"
                  lineJoin="round"
                  listening={true}
                  onClick={(e) => {
                    if (!onAddIntermediatePoint) return;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    
                    // クリック位置を取得
                    const pointerPos = stage.getPointerPosition();
                    if (!pointerPos) return;
                    
                    // キャンバス座標をワールド座標に変換
                    const worldX = (pointerPos.x / CANVAS_WIDTH_PX) * fieldWidth;
                    const worldY = (pointerPos.y / CANVAS_HEIGHT_PX) * fieldHeight;
                    
                    // 最も近いセグメントを見つけて、その中間カウントを計算
                    let nearestSegment: { start: PathPoint; end: PathPoint; distance: number } | null = null;
                    let minDistance = Infinity;
                    
                    for (let i = 0; i < path.points.length - 1; i++) {
                      const start = path.points[i];
                      const end = path.points[i + 1];
                      const startCanvas = worldToCanvas(start.position, fieldWidth, fieldHeight);
                      const endCanvas = worldToCanvas(end.position, fieldWidth, fieldHeight);
                      
                      // 点から線分への距離を計算
                      const A = pointerPos.x - startCanvas.x;
                      const B = pointerPos.y - startCanvas.y;
                      const C = endCanvas.x - startCanvas.x;
                      const D = endCanvas.y - startCanvas.y;
                      
                      const dot = A * C + B * D;
                      const lenSq = C * C + D * D;
                      let param = lenSq !== 0 ? dot / lenSq : -1;
                      
                      let xx: number, yy: number;
                      
                      if (param < 0) {
                        xx = startCanvas.x;
                        yy = startCanvas.y;
                      } else if (param > 1) {
                        xx = endCanvas.x;
                        yy = endCanvas.y;
                      } else {
                        xx = startCanvas.x + param * C;
                        yy = startCanvas.y + param * D;
                      }
                      
                      const dx = pointerPos.x - xx;
                      const dy = pointerPos.y - yy;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      if (distance < minDistance) {
                        minDistance = distance;
                        nearestSegment = { start, end, distance };
                      }
                    }
                    
                    if (nearestSegment && minDistance < 20) { // 20px以内
                      // 中間カウントを計算
                      const midCount = Math.round((nearestSegment.start.count + nearestSegment.end.count) / 2);
                      
                      onAddIntermediatePoint(path.memberId, midCount, { x: worldX, y: worldY });
                    }
                  }}
                />
                {/* パスライン（表示用） */}
                <Line
                  points={canvasPoints}
                  stroke={path.memberColor}
                  strokeWidth={2}
                  opacity={0.6}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                />
                {/* パスポイント */}
                {path.points.map((point, idx) => {
                  const canvasPos = worldToCanvas(point.position, fieldWidth, fieldHeight);
                  const isIntermediate = point.isIntermediate ?? false;
                  
                  return (
                    <Circle
                      key={`${path.memberId}-${point.count}-${idx}`}
                      x={canvasPos.x}
                      y={canvasPos.y}
                      radius={isIntermediate ? 4 : 6}
                      fill={isIntermediate ? "#ffd700" : path.memberColor}
                      stroke={isIntermediate ? "#d35400" : "#ffffff"}
                      strokeWidth={1}
                      opacity={0.9}
                      draggable={isIntermediate}
                      listening={true}
                      onDragEnd={(e) => {
                        if (!isIntermediate || !onAddIntermediatePoint) return;
                        const stage = e.target.getStage();
                        if (!stage) return;
                        
                        // キャンバス座標をワールド座標に変換
                        const canvasX = e.target.x();
                        const canvasY = e.target.y();
                        const worldX = (canvasX / CANVAS_WIDTH_PX) * fieldWidth;
                        const worldY = (canvasY / CANVAS_HEIGHT_PX) * fieldHeight;
                        
                        onAddIntermediatePoint(path.memberId, point.count, { x: worldX, y: worldY });
                      }}
                      onClick={(e) => {
                        if (!isIntermediate || !onRemoveIntermediatePoint) return;
                        // 右クリックまたはCtrl+クリックで削除
                        if (e.evt.button === 2 || e.evt.ctrlKey || e.evt.metaKey) {
                          e.cancelBubble = true;
                          onRemoveIntermediatePoint(path.memberId, point.count);
                        }
                      }}
                      onContextMenu={(e) => {
                        // 右クリックメニューを無効化
                        e.evt.preventDefault();
                        if (isIntermediate && onRemoveIntermediatePoint) {
                          onRemoveIntermediatePoint(path.memberId, point.count);
                        }
                      }}
                    />
                  );
                })}
              </Group>
            );
          })}

          {/* 衝突の可視化 */}
          {showCollisions && collisions.map((collision, idx) => {
            const canvas1 = worldToCanvas(collision.position1, fieldWidth, fieldHeight);
            const canvas2 = worldToCanvas(collision.position2, fieldWidth, fieldHeight);
            const centerX = (canvas1.x + canvas2.x) / 2;
            const centerY = (canvas1.y + canvas2.y) / 2;

            return (
              <Group key={`collision-${collision.count}-${idx}`}>
                {/* 衝突ライン */}
                <Line
                  points={[canvas1.x, canvas1.y, canvas2.x, canvas2.y]}
                  stroke="#ff0000"
                  strokeWidth={2}
                  opacity={0.8}
                  dash={[5, 5]}
                />
                {/* 衝突マーカー */}
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={8}
                  fill="#ff0000"
                  opacity={0.7}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}



import { useMemo, useState } from "react";
import { Stage, Layer, Line, Circle, Group } from "react-konva";
import Konva from "konva";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { WorldPos } from "@/lib/drill/types";
import { useSettings } from "@/context/SettingsContext";

type PathPoint = {
  count: number;
  position: WorldPos;
  isIntermediate?: boolean; // 中間点かどうか
};

type PathVisualizationProps = {
  sets: UiSet[];
  members: Member[];
  selectedMemberIds: string[];
  showPaths: boolean;
  showCollisions: boolean;
  smoothingEnabled: boolean;
  onAddIntermediatePoint?: (memberId: string, count: number, position: WorldPos) => void;
  onRemoveIntermediatePoint?: (memberId: string, count: number) => void;
  fieldWidth: number;
  fieldHeight: number;
  scale: number;
};

const CANVAS_WIDTH_PX = 700;
const CANVAS_HEIGHT_PX = 700;

// ワールド座標をキャンバス座標に変換
function worldToCanvas(worldPos: WorldPos, fieldWidth: number, fieldHeight: number): { x: number; y: number } {
  const canvasX = (worldPos.x / fieldWidth) * CANVAS_WIDTH_PX;
  const canvasY = (worldPos.y / fieldHeight) * CANVAS_HEIGHT_PX;
  return { x: canvasX, y: canvasY };
}

// セット間のパスを計算
function calculatePath(
  sets: UiSet[],
  memberId: string,
  smoothingEnabled: boolean
): PathPoint[] {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const path: PathPoint[] = [];

  sortedSets.forEach((set) => {
    const pos = set.positions[memberId];
    if (pos) {
      path.push({
        count: set.startCount,
        position: pos,
        isIntermediate: false,
      });
    }

    // positionsByCountからも中間点を追加
    if (set.positionsByCount) {
      Object.entries(set.positionsByCount).forEach(([countStr, memberPositions]) => {
        const count = Number(countStr);
        const memberPos = memberPositions[memberId];
        if (memberPos && count !== set.startCount) {
          path.push({
            count,
            position: memberPos,
            isIntermediate: true,
          });
        }
      });
    }
  });

  // カウント順にソート
  path.sort((a, b) => a.count - b.count);

  // スムージング（簡易実装：線形補間）
  if (smoothingEnabled && path.length > 2) {
    // ここでは単純に既存のパスを使用（実際のスムージングは別途実装）
    return path;
  }

  return path;
}

// 衝突検知
function detectCollisions(
  sets: UiSet[],
  members: Member[],
  selectedMemberIds: string[]
): Array<{
  count: number;
  member1: string;
  member2: string;
  position1: WorldPos;
  position2: WorldPos;
  distance: number;
}> {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const collisions: Array<{
    count: number;
    member1: string;
    member2: string;
    position1: WorldPos;
    position2: WorldPos;
    distance: number;
  }> = [];
  const SAFE_DISTANCE = 1.25; // 2ステップ = 1.25m

  sortedSets.forEach((set) => {
    const selectedPositions: Array<{ memberId: string; position: WorldPos }> = [];
    
    selectedMemberIds.forEach((memberId) => {
      const pos = set.positions[memberId];
      if (pos) {
        selectedPositions.push({ memberId, position: pos });
      }
    });

    for (let i = 0; i < selectedPositions.length; i++) {
      for (let j = i + 1; j < selectedPositions.length; j++) {
        const pos1 = selectedPositions[i].position;
        const pos2 = selectedPositions[j].position;
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < SAFE_DISTANCE) {
          collisions.push({
            count: set.startCount,
            member1: selectedPositions[i].memberId,
            member2: selectedPositions[j].memberId,
            position1: pos1,
            position2: pos2,
            distance,
          });
        }
      }
    }
  });

  return collisions;
}

export default function PathVisualization({
  sets,
  members,
  selectedMemberIds,
  showPaths,
  showCollisions,
  smoothingEnabled,
  onAddIntermediatePoint,
  onRemoveIntermediatePoint,
  fieldWidth,
  fieldHeight,
  scale,
}: PathVisualizationProps) {
  const { settings } = useSettings();

  // 選択メンバーのパスを計算
  const paths = useMemo(() => {
    if (!showPaths || selectedMemberIds.length === 0) return [];
    
    return selectedMemberIds.map((memberId) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return null;
      
      return {
        memberId,
        memberName: member.name,
        memberColor: member.color || "#888888",
        points: calculatePath(sets, memberId, smoothingEnabled),
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [sets, members, selectedMemberIds, showPaths, smoothingEnabled]);

  // 衝突を検出
  const collisions = useMemo(() => {
    if (!showCollisions || selectedMemberIds.length < 2) return [];
    return detectCollisions(sets, members, selectedMemberIds);
  }, [sets, members, selectedMemberIds, showCollisions]);

  if (!showPaths && !showCollisions) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: CANVAS_WIDTH_PX * scale,
        height: CANVAS_HEIGHT_PX * scale,
        pointerEvents: "none",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <Stage
        width={CANVAS_WIDTH_PX}
        height={CANVAS_HEIGHT_PX}
        style={{ pointerEvents: "auto" }}
      >
        <Layer>
          {/* パスの描画 */}
          {showPaths && paths.map((path) => {
            if (path.points.length < 2) return null;

            const canvasPoints: number[] = [];
            path.points.forEach((point) => {
              const canvas = worldToCanvas(point.position, fieldWidth, fieldHeight);
              canvasPoints.push(canvas.x, canvas.y);
            });

            return (
              <Group key={path.memberId}>
                {/* パスライン */}
                <Line
                  points={canvasPoints}
                  stroke={path.memberColor}
                  strokeWidth={8}
                  opacity={0}
                  lineCap="round"
                  lineJoin="round"
                  listening={true}
                  onClick={(e) => {
                    if (!onAddIntermediatePoint) return;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    
                    // クリック位置を取得
                    const pointerPos = stage.getPointerPosition();
                    if (!pointerPos) return;
                    
                    // キャンバス座標をワールド座標に変換
                    const worldX = (pointerPos.x / CANVAS_WIDTH_PX) * fieldWidth;
                    const worldY = (pointerPos.y / CANVAS_HEIGHT_PX) * fieldHeight;
                    
                    // 最も近いセグメントを見つけて、その中間カウントを計算
                    let nearestSegment: { start: PathPoint; end: PathPoint; distance: number } | null = null;
                    let minDistance = Infinity;
                    
                    for (let i = 0; i < path.points.length - 1; i++) {
                      const start = path.points[i];
                      const end = path.points[i + 1];
                      const startCanvas = worldToCanvas(start.position, fieldWidth, fieldHeight);
                      const endCanvas = worldToCanvas(end.position, fieldWidth, fieldHeight);
                      
                      // 点から線分への距離を計算
                      const A = pointerPos.x - startCanvas.x;
                      const B = pointerPos.y - startCanvas.y;
                      const C = endCanvas.x - startCanvas.x;
                      const D = endCanvas.y - startCanvas.y;
                      
                      const dot = A * C + B * D;
                      const lenSq = C * C + D * D;
                      let param = lenSq !== 0 ? dot / lenSq : -1;
                      
                      let xx: number, yy: number;
                      
                      if (param < 0) {
                        xx = startCanvas.x;
                        yy = startCanvas.y;
                      } else if (param > 1) {
                        xx = endCanvas.x;
                        yy = endCanvas.y;
                      } else {
                        xx = startCanvas.x + param * C;
                        yy = startCanvas.y + param * D;
                      }
                      
                      const dx = pointerPos.x - xx;
                      const dy = pointerPos.y - yy;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      if (distance < minDistance) {
                        minDistance = distance;
                        nearestSegment = { start, end, distance };
                      }
                    }
                    
                    if (nearestSegment && minDistance < 20) { // 20px以内
                      // 中間カウントを計算
                      const midCount = Math.round((nearestSegment.start.count + nearestSegment.end.count) / 2);
                      
                      onAddIntermediatePoint(path.memberId, midCount, { x: worldX, y: worldY });
                    }
                  }}
                />
                {/* パスライン（表示用） */}
                <Line
                  points={canvasPoints}
                  stroke={path.memberColor}
                  strokeWidth={2}
                  opacity={0.6}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                />
                {/* パスポイント */}
                {path.points.map((point, idx) => {
                  const canvasPos = worldToCanvas(point.position, fieldWidth, fieldHeight);
                  const isIntermediate = point.isIntermediate ?? false;
                  
                  return (
                    <Circle
                      key={`${path.memberId}-${point.count}-${idx}`}
                      x={canvasPos.x}
                      y={canvasPos.y}
                      radius={isIntermediate ? 4 : 6}
                      fill={isIntermediate ? "#ffd700" : path.memberColor}
                      stroke={isIntermediate ? "#d35400" : "#ffffff"}
                      strokeWidth={1}
                      opacity={0.9}
                      draggable={isIntermediate}
                      listening={true}
                      onDragEnd={(e) => {
                        if (!isIntermediate || !onAddIntermediatePoint) return;
                        const stage = e.target.getStage();
                        if (!stage) return;
                        
                        // キャンバス座標をワールド座標に変換
                        const canvasX = e.target.x();
                        const canvasY = e.target.y();
                        const worldX = (canvasX / CANVAS_WIDTH_PX) * fieldWidth;
                        const worldY = (canvasY / CANVAS_HEIGHT_PX) * fieldHeight;
                        
                        onAddIntermediatePoint(path.memberId, point.count, { x: worldX, y: worldY });
                      }}
                      onClick={(e) => {
                        if (!isIntermediate || !onRemoveIntermediatePoint) return;
                        // 右クリックまたはCtrl+クリックで削除
                        if (e.evt.button === 2 || e.evt.ctrlKey || e.evt.metaKey) {
                          e.cancelBubble = true;
                          onRemoveIntermediatePoint(path.memberId, point.count);
                        }
                      }}
                      onContextMenu={(e) => {
                        // 右クリックメニューを無効化
                        e.evt.preventDefault();
                        if (isIntermediate && onRemoveIntermediatePoint) {
                          onRemoveIntermediatePoint(path.memberId, point.count);
                        }
                      }}
                    />
                  );
                })}
              </Group>
            );
          })}

          {/* 衝突の可視化 */}
          {showCollisions && collisions.map((collision, idx) => {
            const canvas1 = worldToCanvas(collision.position1, fieldWidth, fieldHeight);
            const canvas2 = worldToCanvas(collision.position2, fieldWidth, fieldHeight);
            const centerX = (canvas1.x + canvas2.x) / 2;
            const centerY = (canvas1.y + canvas2.y) / 2;

            return (
              <Group key={`collision-${collision.count}-${idx}`}>
                {/* 衝突ライン */}
                <Line
                  points={[canvas1.x, canvas1.y, canvas2.x, canvas2.y]}
                  stroke="#ff0000"
                  strokeWidth={2}
                  opacity={0.8}
                  dash={[5, 5]}
                />
                {/* 衝突マーカー */}
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={8}
                  fill="#ff0000"
                  opacity={0.7}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

