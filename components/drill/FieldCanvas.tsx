// components/drill/FieldCanvas.tsx
"use client";

import { useRef } from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";

type WorldPos = { x: number; y: number };

type Member = {
  id: string;
  name: string;
  part: string;
  color?: string;
};

export type ArcBinding = {
  setId: string;
  ctrl: WorldPos[]; // [p0, p1, p2]
  params: Record<string, number>; // memberId -> t(0-1)
};

// ===== フィールド設定（page.tsx と揃えること） =====
const FIELD_WIDTH_M = 40;
const FIELD_HEIGHT_M = 30;

const CANVAS_WIDTH_PX = 800;
const CANVAS_HEIGHT_PX = 600;

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

type Props = {
  members: Member[];
  displayPositions: Record<string, WorldPos>;
  currentSetPositions: Record<string, WorldPos>;
  selectedIds: string[];                         // ← 複数選択
  onToggleSelect: (id: string, multi: boolean) => void; // ← Ctrl 対応
  isPlaying: boolean;
  activeArc: ArcBinding | null;
  onMoveMember: (id: string, xPx: number, yPx: number) => void;
  onUpdateArcPoint: (index: number, pos: WorldPos) => void;
  onMoveArcGroup: (dx: number, dy: number) => void;
};

export default function FieldCanvas({
  members,
  displayPositions,
  currentSetPositions,
  selectedIds,
  onToggleSelect,
  isPlaying,
  activeArc,
  onMoveMember,
  onUpdateArcPoint,
  onMoveArcGroup,
}: Props) {
  const groupDragCenterRef = useRef<WorldPos | null>(null);

  const arcCenterWorld =
    activeArc && activeArc.ctrl.length === 3
      ? {
          x:
            (activeArc.ctrl[0].x +
              activeArc.ctrl[1].x +
              activeArc.ctrl[2].x) /
            3,
          y:
            (activeArc.ctrl[0].y +
              activeArc.ctrl[1].y +
              activeArc.ctrl[2].y) /
            3,
        }
      : null;

  return (
    <Stage width={CANVAS_WIDTH_PX} height={CANVAS_HEIGHT_PX}>
      <Layer>
        {/* グリッド（縦線） */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = (FIELD_WIDTH_M / 8) * i * scaleX;
          return (
            <Line
              key={`v-${i}`}
              points={[x, 0, x, CANVAS_HEIGHT_PX]}
              stroke="#ccc"
              strokeWidth={1}
            />
          );
        })}

        {/* グリッド（横線） */}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = (FIELD_HEIGHT_M / 5) * i * scaleY;
          return (
            <Line
              key={`h-${i}`}
              points={[0, y, CANVAS_WIDTH_PX, y]}
              stroke="#ccc"
              strokeWidth={1}
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
          stroke="#333"
          strokeWidth={2}
        />

        {/* ===== ベジェアークのコントロール表示 ===== */}
        {activeArc && !isPlaying && (
          (() => {
            const [p0, p1, p2] = activeArc.ctrl;
            const c0 = worldToCanvas(p0);
            const c1 = worldToCanvas(p1);
            const c2 = worldToCanvas(p2);

            return (
              <>
                {/* ガイドライン */}
                <Line
                  points={[c0.x, c0.y, c1.x, c1.y, c2.x, c2.y]}
                  stroke="#0070f3"
                  strokeWidth={1}
                  dash={[4, 4]}
                />

                {/* コントロールポイント3つ */}
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

                {/* 全体移動ハンドル */}
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
          })()
        )}

        {/* ===== ドット描画 ===== */}
        {members.map((m) => {
          const pos = displayPositions[m.id];
          if (!pos) return null;

          const canvasPos = worldToCanvas(pos);
          const isSelected = selectedIds.includes(m.id);

          return (
            <>
              <Circle
                key={m.id}
                x={canvasPos.x}
                y={canvasPos.y}
                radius={isSelected ? 11 : 9}
                fill={m.color ?? "#999"}
                stroke={isSelected ? "black" : undefined}
                strokeWidth={isSelected ? 3 : 0}
                draggable={!isPlaying && !activeArc}
                onClick={(e: any) => {
                  const multi = e.evt?.ctrlKey || e.evt?.metaKey;
                  onToggleSelect(m.id, !!multi);
                }}
                onTap={() => {
                  // タップは単一選択扱い
                  onToggleSelect(m.id, false);
                }}
                onDragMove={(e: any) => {
                  if (isPlaying || activeArc) return;
                  const { x, y } = e.target.position();
                  onMoveMember(m.id, x, y);
                }}
              />
              <Text
                key={m.id + "-label"}
                x={canvasPos.x + 12}
                y={canvasPos.y - 6}
                text={m.name}
                fontSize={12}
              />
            </>
          );
        })}
      </Layer>
    </Stage>
  );
}
