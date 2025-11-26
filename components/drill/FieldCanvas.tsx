// components/drill/FieldCanvas.tsx
"use client";

import { useRef, useState } from "react";
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
  onMoveMember: (id: string, pos: WorldPos) => void;
  onUpdateArcPoint: (index: number, pos: WorldPos) => void;
  onMoveArcGroup: (dx: number, dy: number) => void;
  scale: number;
  onRectSelect?: (ids: string[]) => void; // ★ 追加
  clampAndSnap: (p: WorldPos) => WorldPos; // ★ 追加
};

// ===== キャンバス設定 =====
const CANVAS_WIDTH_PX = 800;
const CANVAS_HEIGHT_PX = (FIELD_HEIGHT_M / FIELD_WIDTH_M) * CANVAS_WIDTH_PX;

const baseScaleX = CANVAS_WIDTH_PX / FIELD_WIDTH_M;
const baseScaleY = CANVAS_HEIGHT_PX / FIELD_HEIGHT_M;

const worldToCanvas = (pos: WorldPos) => ({
  x: pos.x * baseScaleX,
  y: pos.y * baseScaleY,
});

const canvasToWorld = (x: number, y: number) => ({
  x: x / baseScaleX,
  y: y / baseScaleY,
});

// 矩形選択用の型
type SelectionRect = { x: number; y: number; w: number; h: number };

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
  scale,
  onRectSelect,
  clampAndSnap,
}: Props) {
  const groupDragCenterRef = useRef<WorldPos | null>(null);

  // ★ 矩形選択の状態
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // ベジェアークの中心
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
  const stepPxX = STEP_M * baseScaleX;
  const stepPxY = STEP_M * baseScaleY;

  return (
    <Stage
      width={CANVAS_WIDTH_PX}
      height={CANVAS_HEIGHT_PX}
      scaleX={scale}
      scaleY={scale}
      // ===== 矩形選択用 Stage ハンドラ =====
      onMouseDown={(e: any) => {
        if (isPlaying || activeArc) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const sx = stage.scaleX() || 1;
        const sy = stage.scaleY() || 1;

        const x = pointer.x / sx;
        const y = pointer.y / sy;

        selectionStartRef.current = { x, y };
        setSelectionRect({ x, y, w: 0, h: 0 });
      }}
      onMouseMove={(e: any) => {
        if (!selectionStartRef.current || !selectionRect) return;

        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const sx = stage.scaleX() || 1;
        const sy = stage.scaleY() || 1;

        const x = pointer.x / sx;
        const y = pointer.y / sy;

        const start = selectionStartRef.current;
        const rectX = Math.min(start.x, x);
        const rectY = Math.min(start.y, y);
        const rectW = Math.abs(x - start.x);
        const rectH = Math.abs(y - start.y);

        setSelectionRect({ x: rectX, y: rectY, w: rectW, h: rectH });
      }}
      onMouseUp={(e: any) => {
  if (!selectionStartRef.current || !selectionRect) {
    selectionStartRef.current = null;
    setSelectionRect(null);
    return;
  }

  const rect = selectionRect;
  selectionStartRef.current = null;
  setSelectionRect(null);

  if (!onRectSelect) return;

  const selected: string[] = [];
  members.forEach((m) => {
    const pos = displayPositions[m.id];
    if (!pos) return;
    const c = worldToCanvas(pos);
    if (
      c.x >= rect.x &&
      c.x <= rect.x + rect.w &&
      c.y >= rect.y &&
      c.y <= rect.y + rect.h
    ) {
      selected.push(m.id);
    }
  });

  // ★ Shift が押されていたら「既存 + 新しい選択」の和集合にする
  const addMode = e.evt?.shiftKey;
  const finalIds = addMode
    ? Array.from(new Set([...selectedIds, ...selected]))
    : selected;

  onRectSelect(finalIds);
}}


      
      onMouseLeave={() => {
        selectionStartRef.current = null;
        setSelectionRect(null);
      }}
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

        {/* ベジェアークのコントロール表示（既存のまま） */}
        {activeArc &&
          !isPlaying &&
          (() => {
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
                      if (isPlaying) return;
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

        {/* ドット + 楽器名 */}
        {members.map((m) => {
          const pos = displayPositions[m.id];
          if (!pos) return null;

          const canvasPos = worldToCanvas(pos);
          const isSelected = selectedIds.includes(m.id);

          return (
            <Group
  key={m.id}
  x={canvasPos.x}
  y={canvasPos.y}
  draggable={!isPlaying && !activeArc}
  onClick={(e: any) => {
  const multi =
    e.evt?.ctrlKey || e.evt?.metaKey || e.evt?.shiftKey; // ★ Shift も OK にする
  onToggleSelect(m.id, !!multi);
}}

  onTap={() => {
    onToggleSelect(m.id, false);
  }}
  // ★ ドラッグ中に常に handleMove を呼ぶ
  onDragMove={(e: any) => {
    if (isPlaying || activeArc) return;

    const rawPos = e.target.position();       // キャンバス座標（ズレてる）
    const worldRaw = canvasToWorld(rawPos.x, rawPos.y);
    const worldSnapped = clampAndSnap(worldRaw);      // ★ スナップ & クランプ
    const canvasSnapped = worldToCanvas(worldSnapped);
    
    // 見た目もスナップ位置に強制
    e.target.position({
      x: canvasSnapped.x,
      y: canvasSnapped.y,
    });

    // 状態もスナップ済み座標で更新
    onMoveMember(m.id, worldSnapped);
  }}
  // onDragEnd を修正
  onDragEnd={(e: any) => {
    if (isPlaying || activeArc) return;

    const rawPos = e.target.position();
    const worldRaw = canvasToWorld(rawPos.x, rawPos.y);
    const worldSnapped = clampAndSnap(worldRaw);
    const canvasSnapped = worldToCanvas(worldSnapped);

    e.target.position({
      x: canvasSnapped.x,
      y: canvasSnapped.y,
    });

    onMoveMember(m.id, worldSnapped);
  }}
>

              <Circle x={0} y={0} radius={10} opacity={0} />

              {/* ✕ マーク */}
              <Line
                points={[-8, -8, 8, 8]}
                stroke={m.color ?? "#f1c40f"}
                strokeWidth={isSelected ? 4 : 2}
                lineCap="round"
              />
              <Line
                points={[-8, 8, 8, -8]}
                stroke={m.color ?? "#f1c40f"}
                strokeWidth={isSelected ? 4 : 2}
                lineCap="round"
              />

              <Text x={12} 
              y={-6} 
              text={m.name} 
              fontSize={12} 
              fill="#ffffff" 
              listening={false}
               />
            </Group>
          );
        })}

        {/* ★ 矩形選択の表示 */}
        {selectionRect && (
          <Rect
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.w}
            height={selectionRect.h}
            stroke="#38bdf8"
            strokeWidth={1}
            dash={[4, 4]}
            fill="rgba(56,189,248,0.15)"
          />
        )}
      </Layer>
    </Stage>
  );
}
