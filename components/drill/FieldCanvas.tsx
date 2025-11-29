// components/drill/FieldCanvas.tsx
"use client";

import { useRef, useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { Stage, Layer, Line, Circle, Text, Rect, Group } from "react-konva";

import type { WorldPos, Member, ArcBinding } from "../../lib/drill/types";
import { STEP_M } from "../../lib/drill/utils";
import { useSettings } from "@/context/SettingsContext";

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
  onRotateSelected?: (center: WorldPos, angle: number) => void; // 回転コールバック
  individualPlacementMode?: boolean; // 個別配置モード
  onPlaceMember?: (id: string, pos: WorldPos) => void; // 個別配置コールバック
  placementQueue?: string[]; // 配置待ちのメンバーIDリスト
};

// ===== キャンバス設定 =====
const CANVAS_WIDTH_PX = 800;

// 矩形選択用の型
type SelectionRect = { x: number; y: number; w: number; h: number };

export type FieldCanvasRef = {
  getStage: () => any;
  exportImage: (format?: "png" | "jpeg", scale?: number) => Promise<Blob | null>;
  captureFrame: () => Promise<Blob | null>; // 録画用
};

const FieldCanvas = forwardRef<FieldCanvasRef, Props>((props, ref) => {
  const {
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
    onRotateSelected,
    individualPlacementMode = false,
    onPlaceMember,
    placementQueue = [],
  } = props;
  
  // 設定を取得
  const { settings } = useSettings();
  const fieldWidth = settings.fieldWidth;
  const fieldHeight = settings.fieldHeight;
  const showGrid = settings.showGrid;
  const gridInterval = settings.gridInterval;
  const backgroundColor = settings.backgroundColor;
  const backgroundTransparent = settings.backgroundTransparent;

  // キャンバスサイズとスケールを計算
  const CANVAS_HEIGHT_PX = useMemo(
    () => (fieldHeight / fieldWidth) * CANVAS_WIDTH_PX,
    [fieldWidth, fieldHeight]
  );
  const baseScaleX = useMemo(
    () => CANVAS_WIDTH_PX / fieldWidth,
    [fieldWidth]
  );
  const baseScaleY = useMemo(
    () => CANVAS_HEIGHT_PX / fieldHeight,
    [fieldHeight, CANVAS_HEIGHT_PX]
  );

  // 座標変換関数
  const worldToCanvas = useMemo(
    () => (pos: WorldPos) => ({
      x: pos.x * baseScaleX,
      y: pos.y * baseScaleY,
    }),
    [baseScaleX, baseScaleY]
  );

  const canvasToWorld = useMemo(
    () => (x: number, y: number) => ({
      x: x / baseScaleX,
      y: y / baseScaleY,
    }),
    [baseScaleX, baseScaleY]
  );

  const groupDragCenterRef = useRef<WorldPos | null>(null);
  const stageRef = useRef<any>(null);
  const rotationStartAngleRef = useRef<number | null>(null);
  const rotationCenterRef = useRef<WorldPos | null>(null);
  const rotationInitialPositionsRef = useRef<Record<string, WorldPos> | null>(null);

  // ★ 矩形選択の状態
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // ref経由でエクスポート機能を公開
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    exportImage: async (format: "png" | "jpeg" = "png", scale: number = 2) => {
      if (!stageRef.current) return null;
      try {
        const dataURL = stageRef.current.toDataURL({
          mimeType: format === "jpeg" ? "image/jpeg" : "image/png",
          quality: 0.95,
          pixelRatio: scale,
        });
        const response = await fetch(dataURL);
        return await response.blob();
      } catch (error) {
        console.error("Failed to export image:", error);
        return null;
      }
    },
    captureFrame: async () => {
      if (!stageRef.current) return null;
      try {
        const dataURL = stageRef.current.toDataURL({
          mimeType: "image/png",
          quality: 1.0,
          pixelRatio: 2,
        });
        const response = await fetch(dataURL);
        return await response.blob();
      } catch (error) {
        console.error("Failed to capture frame:", error);
        return null;
      }
    },
  }));

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
  const totalStepsX = useMemo(
    () => Math.round(fieldWidth / STEP_M),
    [fieldWidth]
  );
  const totalStepsY = useMemo(
    () => Math.round(fieldHeight / STEP_M),
    [fieldHeight]
  );
  const stepPxX = useMemo(() => STEP_M * baseScaleX, [baseScaleX]);
  const stepPxY = useMemo(() => STEP_M * baseScaleY, [baseScaleY]);

  return (
    <Stage
      ref={stageRef}
      width={CANVAS_WIDTH_PX}
      height={CANVAS_HEIGHT_PX}
      scaleX={scale}
      scaleY={scale}
      // ===== 個別配置モード用クリックハンドラ =====
      onClick={(e: any) => {
        // 個別配置モードの場合、フィールドをクリックしたらメンバーを配置
        if (individualPlacementMode && onPlaceMember && placementQueue.length > 0) {
          // メンバーや他の要素をクリックした場合はスキップ
          if (e.target === e.target.getStage() || e.target.getClassName() === "Rect") {
            const stage = e.target.getStage();
            const pointerPos = stage.getPointerPosition();
            if (pointerPos) {
              const worldPos = canvasToWorld(pointerPos.x / scale, pointerPos.y / scale);
              const snappedPos = clampAndSnap(worldPos);
              
              // 次のメンバーを配置
              const nextMemberId = placementQueue[0];
              onPlaceMember(nextMemberId, snappedPos);
            }
          }
        }
      }}
      // ===== 矩形選択用 Stage ハンドラ =====
      onMouseDown={(e: any) => {
        if (isPlaying || activeArc || individualPlacementMode) return;

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
        // 矩形の座標とサイズをそのまま保持（キャンバスの外に出てもOK）
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
        {/* フィールド背景 */}
        {!backgroundTransparent && (
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH_PX}
            height={CANVAS_HEIGHT_PX}
            fill={backgroundColor}
          />
        )}

        {/* グリッド（縦線） */}
        {showGrid &&
          Array.from({ length: Math.floor(totalStepsX / gridInterval) + 1 }).map((_, i) => {
            const stepIndex = i * gridInterval;
            const x = stepIndex * stepPxX;
            const isBold = stepIndex % 8 === 0;

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
        {showGrid &&
          Array.from({ length: Math.floor(totalStepsY / gridInterval) + 1 }).map((_, i) => {
            const stepIndex = i * gridInterval;
            const y = stepIndex * stepPxY;
            const isBold = stepIndex % 8 === 0;

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
                e.cancelBubble = true; // イベントの伝播を防ぐ
                const multi =
                  e.evt?.ctrlKey || e.evt?.metaKey || e.evt?.shiftKey; // ★ Shift も OK にする
                onToggleSelect(m.id, !!multi);
              }}
              onTap={(e: any) => {
                // onTapはタッチデバイス用。マウス操作ではonClickが優先される
                // 修飾キーが押されている場合は複数選択モード
                const multi =
                  e.evt?.ctrlKey || e.evt?.metaKey || e.evt?.shiftKey;
                onToggleSelect(m.id, !!multi);
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
        {selectionRect && (() => {
          // 矩形がキャンバスの境界を超えても表示されるように、座標とサイズを調整
          let displayX = selectionRect.x;
          let displayY = selectionRect.y;
          let displayW = selectionRect.w;
          let displayH = selectionRect.h;

          // キャンバスの左端を超えた場合
          if (displayX < 0) {
            displayW += displayX; // 負の値分だけ幅を減らす
            displayX = 0;
          }
          // キャンバスの上端を超えた場合
          if (displayY < 0) {
            displayH += displayY; // 負の値分だけ高さを減らす
            displayY = 0;
          }
          // キャンバスの右端を超えた場合
          if (displayX + displayW > CANVAS_WIDTH_PX) {
            displayW = CANVAS_WIDTH_PX - displayX;
          }
          // キャンバスの下端を超えた場合
          if (displayY + displayH > CANVAS_HEIGHT_PX) {
            displayH = CANVAS_HEIGHT_PX - displayY;
          }

          // 有効な矩形のみ表示（幅と高さが正の値の場合）
          if (displayW > 0 && displayH > 0) {
            return (
              <Rect
                x={displayX}
                y={displayY}
                width={displayW}
                height={displayH}
                stroke="#38bdf8"
                strokeWidth={1}
                dash={[4, 4]}
                fill="rgba(56,189,248,0.15)"
              />
            );
          }
          return null;
        })()}

        {/* 回転ハンドル（選択メンバーが2人以上の場合） */}
        {selectedIds.length >= 2 && !isPlaying && !activeArc && onRotateSelected && (() => {
          // 選択メンバーの中心を計算（現在の位置から）
          const selectedPositions = selectedIds
            .map((id) => displayPositions[id])
            .filter((p): p is WorldPos => p !== undefined);

          if (selectedPositions.length < 2) return null;

          const center: WorldPos = {
            x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
            y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
          };

          const centerCanvas = worldToCanvas(center);
          const handleDistance = 40; // ハンドルまでの距離（ピクセル）
          
          // ハンドルの初期位置（中心から上方向）
          const initialHandleAngle = -Math.PI / 2; // 上方向
          const handleCanvasPos = {
            x: centerCanvas.x + Math.cos(initialHandleAngle) * handleDistance,
            y: centerCanvas.y + Math.sin(initialHandleAngle) * handleDistance,
          };

          return (
            <Group key="rotation-handle">
              {/* 中心からハンドルへの線 */}
              <Line
                points={[centerCanvas.x, centerCanvas.y, handleCanvasPos.x, handleCanvasPos.y]}
                stroke="#60a5fa"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              
              {/* 回転ハンドル */}
              <Circle
                x={handleCanvasPos.x}
                y={handleCanvasPos.y}
                radius={8}
                fill="#3b82f6"
                stroke="#1e40af"
                strokeWidth={2}
                draggable
                onDragStart={(e: any) => {
                  // ドラッグ開始時の角度を記録
                  const handlePos = e.target.position();
                  const handleWorld = canvasToWorld(handlePos.x / scale, handlePos.y / scale);
                  const dx = handleWorld.x - center.x;
                  const dy = handleWorld.y - center.y;
                  rotationStartAngleRef.current = Math.atan2(dy, dx);
                  rotationCenterRef.current = center;
                  
                  // 初期位置を保存（回転の基準点として使用）
                  rotationInitialPositionsRef.current = {};
                  selectedIds.forEach((id) => {
                    const pos = displayPositions[id];
                    if (pos) {
                      rotationInitialPositionsRef.current![id] = { ...pos };
                    }
                  });
                }}
                onDragMove={(e: any) => {
                  if (
                    rotationStartAngleRef.current === null ||
                    !rotationCenterRef.current ||
                    !rotationInitialPositionsRef.current
                  ) return;
                  
                  // 現在のマウス位置から角度を計算
                  const handlePos = e.target.position();
                  const handleWorld = canvasToWorld(handlePos.x / scale, handlePos.y / scale);
                  const dx = handleWorld.x - rotationCenterRef.current.x;
                  const dy = handleWorld.y - rotationCenterRef.current.y;
                  const currentAngle = Math.atan2(dy, dx);
                  
                  // 開始角度からの差分を計算（シンプルな2D回転）
                  const totalAngle = currentAngle - rotationStartAngleRef.current;
                  
                  // 初期位置を基準に回転を計算（累積を避ける）
                  // シンプルな2D回転行列を使用
                  const cos = Math.cos(totalAngle);
                  const sin = Math.sin(totalAngle);
                  
                  // 初期位置から回転した位置を計算
                  selectedIds.forEach((id) => {
                    const initialPos = rotationInitialPositionsRef.current![id];
                    if (!initialPos) return;
                    
                    // 中心からの相対位置
                    const relX = initialPos.x - rotationCenterRef.current!.x;
                    const relY = initialPos.y - rotationCenterRef.current!.y;
                    
                    // 回転後の相対位置
                    const rotatedRelX = relX * cos - relY * sin;
                    const rotatedRelY = relX * sin + relY * cos;
                    
                    // 絶対位置に変換
                    const newPos: WorldPos = {
                      x: rotationCenterRef.current!.x + rotatedRelX,
                      y: rotationCenterRef.current!.y + rotatedRelY,
                    };
                    
                    // 位置を更新（回転中はスナップを適用しない - 精度を保つため）
                    // ただし、フィールド外には出さない
                    const clampedPos: WorldPos = {
                      x: Math.min(Math.max(newPos.x, 0), fieldWidth),
                      y: Math.min(Math.max(newPos.y, 0), fieldHeight),
                    };
                    onMoveMember(id, clampedPos);
                  });
                  
                  // ハンドルの位置を更新（中心からの固定距離を保つ）
                  const handleDistanceWorld = handleDistance / baseScaleX; // ワールド座標での距離
                  const newHandleWorld = {
                    x: rotationCenterRef.current.x + Math.cos(currentAngle) * handleDistanceWorld,
                    y: rotationCenterRef.current.y + Math.sin(currentAngle) * handleDistanceWorld,
                  };
                  const newHandleCanvas = worldToCanvas(newHandleWorld);
                  e.target.position({ x: newHandleCanvas.x, y: newHandleCanvas.y });
                }}
                onDragEnd={(e: any) => {
                  // ドラッグ終了時にスナップを適用（回転の精度を保つため、ドラッグ中はスナップしない）
                  if (rotationInitialPositionsRef.current && rotationCenterRef.current && rotationStartAngleRef.current !== null) {
                    // 現在のハンドル位置から最終角度を取得
                    const handleElement = e.target;
                    const handlePos = handleElement.position();
                    const handleWorld = canvasToWorld(handlePos.x / scale, handlePos.y / scale);
                    const dx = handleWorld.x - rotationCenterRef.current.x;
                    const dy = handleWorld.y - rotationCenterRef.current.y;
                    const finalAngle = Math.atan2(dy, dx);
                    const totalAngle = finalAngle - rotationStartAngleRef.current;
                    
                    // 最終的な回転を適用（スナップ付き）
                    const cos = Math.cos(totalAngle);
                    const sin = Math.sin(totalAngle);
                    
                    selectedIds.forEach((id) => {
                      const initialPos = rotationInitialPositionsRef.current![id];
                      if (!initialPos) return;
                      
                      const relX = initialPos.x - rotationCenterRef.current!.x;
                      const relY = initialPos.y - rotationCenterRef.current!.y;
                      
                      const rotatedRelX = relX * cos - relY * sin;
                      const rotatedRelY = relX * sin + relY * cos;
                      
                      const newPos: WorldPos = {
                        x: rotationCenterRef.current!.x + rotatedRelX,
                        y: rotationCenterRef.current!.y + rotatedRelY,
                      };
                      
                      // ドラッグ終了時にスナップを適用
                      onMoveMember(id, clampAndSnap(newPos));
                    });
                  }
                  
                  rotationStartAngleRef.current = null;
                  rotationCenterRef.current = null;
                  rotationInitialPositionsRef.current = null;
                }}
              />
              
              {/* 中心点の表示 */}
              <Circle
                x={centerCanvas.x}
                y={centerCanvas.y}
                radius={5}
                fill="#60a5fa"
                stroke="#1e40af"
                strokeWidth={1}
                listening={false}
              />
            </Group>
          );
        })()}
      </Layer>
    </Stage>
  );
});

export default FieldCanvas;
