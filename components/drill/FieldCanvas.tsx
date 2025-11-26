// components/drill/FieldCanvas.tsx
"use client";

import { useRef } from "react";
import { Stage, Layer, Line, Circle, Text, Rect, Group } from "react-konva";

import type { WorldPos, Member, ArcBinding } from "../../lib/drill/types";
import { FIELD_WIDTH_M, FIELD_HEIGHT_M, STEP_M } from "../../lib/drill/utils";

type Props = {
  members: Member[];
  displayPositions: Record<string, WorldPos>;
  currentSetPositions: Record<string, WorldPos>;
  selectedIds: string[];
  onToggleSelect: (id: string, multi: boolean) => void;
  isPlaying: boolean;
  activeArc: ArcBinding | null;
  onMoveMember: (id: string, xPx: number, yPx: number) => void;
  onUpdateArcPoint: (index: number, pos: WorldPos) => void;
  onMoveArcGroup: (dx: number, dy: number) => void;
  /** 親コンポーネントから渡されるズーム倍率（1.0 = 等倍） */
  scale: number;
};

// ===== キャンバス設定 =====
const CANVAS_WIDTH_PX = 800;
const CANVAS_HEIGHT_PX = (FIELD_HEIGHT_M / FIELD_WIDTH_M) * CANVAS_WIDTH_PX;

const scaleX = CANVAS_WIDTH_PX / FIELD_WIDTH_M;
const scaleY = CANVAS_HEIGHT_PX / FIELD_HEIGHT_M;

const worldToCanvas = (pos: WorldPos) => ({
  x: pos.x * scaleX,
  y: pos.y * scaleY,
});

const canvasToWorld = (x: number, y: number) => ({
  x: x / scaleX,
  y: y / scaleY,
});

export default function FieldCanvas({
  members,
  displayPositions,
  currentSetPositions, // いまは未使用
  selectedIds,
  onToggleSelect,
  isPlaying,
  activeArc,
  onMoveMember,
  onUpdateArcPoint,
  onMoveArcGroup,
  scale,
}: Props) {
  const groupDragCenterRef = useRef<WorldPos | null>(null);

  const arcCenterWorld =
    activeArc && activeArc.ctrl.length === 3
      ? {
          x:
            (activeArc.ctrl[0].x +
              activeArc.ctrl[1].x +
              activeArc.ctrl[2].x) / 3,
          y:
            (activeArc.ctrl[0].y +
              activeArc.ctrl[1].y +
              activeArc.ctrl[2].y) / 3,
        }
      : null;

  // グリッド用
  const totalStepsX = Math.round(FIELD_WIDTH_M / STEP_M);
  const totalStepsY = Math.round(FIELD_HEIGHT_M / STEP_M);
  const stepPxX = STEP_M * scaleX;
  const stepPxY = STEP_M * scaleY;

  return (
    <Stage
      width={CANVAS_WIDTH_PX}
      height={CANVAS_HEIGHT_PX}
      scaleX={scale}
      scaleY={scale}
      x={0}
      y={0}
      draggable={false} // ★ パン禁止
      // onWheel も付けないのでホイールは単なるページスクロールになる
    >
      <Layer>
        {/* フィールド背景（芝生） */}
        <Rect
          x={0}
          y={0}
          width={CANVAS_WIDTH_PX}
          height={CANVAS_HEIGHT_PX}
          fill="#0a6f2b"
        />

        {/* グリッド（縦線） */}
        {Array.from({ length: totalStepsX + 1 }).map((_, i) => {
          const x = i * stepPxX;
          const isBold = i % 8 === 0;

          return (
            <Line
              key={`v-${i}`}
              points={[x, 0, x, CANVAS_HEIGHT_PX]}
              stroke={isBold ? "#ffffff" : "rgba(255,255,255,0.18)"}
              strokeWidth={isBold ? 3 : 0.5}
            />
          );
        })}

        {/* グリッド（横線） */}
        {Array.from({ length: totalStepsY + 1 }).map((_, i) => {
          const y = i * stepPxY;
          const isBold = i % 8 === 0;

          return (
            <Line
              key={`h-${i}`}
              points={[0, y, CANVAS_WIDTH_PX, y]}
              stroke={isBold ? "#ffffff" : "rgba(255,255,255,0.18)"}
              strokeWidth={isBold ? 3 : 0.5}
            />
          );
        })}

        {/* 外枠 */}
        <Line
          points={[
            0,
            0,
            CANVAS_WIDTH_PX,
            0,
            CANVAS_WIDTH_PX,
            CANVAS_HEIGHT_PX,
            0,
            CANVAS_HEIGHT_PX,
            0,
            0,
          ]}
          stroke="#111"
          strokeWidth={3}
        />

        {/* ベジェアークのコントロール表示 */}
        {activeArc && !isPlaying && (() => {
          const [p0, p1, p2] = activeArc.ctrl;
          const c0 = worldToCanvas(p0);
          const c1 = worldToCanvas(p1);
          const c2 = worldToCanvas(p2);

          return (
            <>
              <Line
                points={[c0.x, c0.y, c1.x, c1.y, c2.x, c2.y]}
                stroke="#0070f3"
                strokeWidth={1}
                dash={[4, 4]}
              />

              {[c0, c1, c2].map((cp, idx) => (
                <Circle
                  key={`ctrl-${idx}`}
                  x={cp.x}
                  y={cp.y}
                  radius={6}
                  fill="#ffffff"
                  stroke="#0070f3"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e: any) => {
                    const { x, y } = e.target.position();
                    const w = canvasToWorld(x, y);
                    onUpdateArcPoint(idx, w);
                  }}
                />
              ))}

              {arcCenterWorld && (
                <Circle
                  x={worldToCanvas(arcCenterWorld).x}
                  y={worldToCanvas(arcCenterWorld).y}
                  radius={7}
                  fill="#ffeaa7"
                  stroke="#d35400"
                  strokeWidth={2}
                  draggable
                  onDragStart={(e: any) => {
                    const { x, y } = e.target.position();
                    groupDragCenterRef.current = canvasToWorld(x, y);
                  }}
                  onDragMove={(e: any) => {
                    if (!groupDragCenterRef.current) return;
                    const prev = groupDragCenterRef.current;
                    const { x, y } = e.target.position();
                    const nowWorld = canvasToWorld(x, y);
                    const dx = nowWorld.x - prev.x;
                    const dy = nowWorld.y - prev.y;
                    groupDragCenterRef.current = nowWorld;
                    onMoveArcGroup(dx, dy);
                  }}
                  onDragEnd={() => {
                    groupDragCenterRef.current = null;
                  }}
                />
              )}
            </>
          );
        })()}

        {/* ドット描画 */}
        {members.map((m) => {
          const pos = displayPositions[m.id];
          if (!pos) return null;

          const canvasPos = worldToCanvas(pos);
          const isSelected = selectedIds.includes(m.id);

          return (
            <Group key={m.id}>
              <Circle
                x={canvasPos.x}
                y={canvasPos.y}
                radius={isSelected ? 11 : 9}
                fill={m.color ?? "#f1c40f"}
                stroke={isSelected ? "#000000" : "rgba(0,0,0,0.6)"}
                strokeWidth={isSelected ? 3 : 1}
                draggable={!isPlaying && !activeArc}
                onClick={(e: any) => {
                  const multi = e.evt?.ctrlKey || e.evt?.metaKey;
                  onToggleSelect(m.id, !!multi);
                }}
                onTap={() => {
                  onToggleSelect(m.id, false);
                }}
                onDragMove={(e: any) => {
                  if (isPlaying || activeArc) return;
                  const { x, y } = e.target.position();
                  onMoveMember(m.id, x, y);
                }}
              />
              <Text
                x={canvasPos.x + 12}
                y={canvasPos.y - 6}
                text={m.name}
                fontSize={12}
                fill="#ffffff"
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
