// components/drill/FieldCanvas.tsx
"use client";

import { useRef, useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { Stage, Layer, Line, Circle, Text, Rect, Group, Shape } from "react-konva";
import Konva from "konva";

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
  // 横一列レイアウト編集用（未確定ラインの両端ハンドル）
  lineEditState?: {
    memberIds: string[];
    start: WorldPos;
    end: WorldPos;
  } | null;
  onUpdateLineEdit?: (start: WorldPos, end: WorldPos) => void;
  // ボックスレイアウト編集用（四隅ハンドル）
  boxEditState?: {
    memberIds: string[];
    cols: number;
    rows: number;
    tl: WorldPos;
    tr: WorldPos;
    br: WorldPos;
    bl: WorldPos;
  } | null;
  onUpdateBoxEdit?: (corners: {
    tl: WorldPos;
    tr: WorldPos;
    br: WorldPos;
    bl: WorldPos;
  }) => void;
};

// ===== キャンバス設定 =====
const CANVAS_WIDTH_PX = 700; // デフォルトサイズを小さくして全体表示を確保

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
    lineEditState = null,
    onUpdateLineEdit,
    boxEditState = null,
    onUpdateBoxEdit,
  } = props;
  
  // 設定を取得
  const { settings } = useSettings();
  const fieldWidth = settings.fieldWidth;
  const fieldHeight = settings.fieldHeight;
  const showGrid = settings.showGrid;
  const gridInterval = settings.gridInterval;
  const boldLines = settings.boldLines || [];
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

  // 座標変換関数（フィールドの左上が(0,0)の座標系）
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
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

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

  // スケール適用後の実際のサイズ
  const scaledWidth = CANVAS_WIDTH_PX * scale;
  const scaledHeight = CANVAS_HEIGHT_PX * scale;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ minHeight: `${CANVAS_HEIGHT_PX * scale}px`, minWidth: `${CANVAS_WIDTH_PX * scale}px` }}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: CANVAS_WIDTH_PX,
          height: CANVAS_HEIGHT_PX,
        }}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH_PX}
          height={CANVAS_HEIGHT_PX}
          scaleX={1}
          scaleY={1}
          style={{ backgroundColor: "#ffffff" }}
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
        {/* フィールド背景 - 一番後ろに配置 */}
        {!backgroundTransparent && (
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH_PX}
            height={CANVAS_HEIGHT_PX}
            fill="#ffffff"
            listening={false}
          />
        )}

        {/* 30m×30mの正方形の枠（黒い太線） - 背景の上 */}
        {/* 真ん中から上下左右に3ポイント（24ステップ）= 30m */}
        {(() => {
          const centerX = CANVAS_WIDTH_PX / 2;
          const centerY = CANVAS_HEIGHT_PX / 2;
          const half30m = 24 * stepPxX; // 3ポイント = 24ステップ
          const half30mY = 24 * stepPxY;
          
          return (
            <Line
              points={[
                centerX - half30m, centerY - half30mY, // 左上
                centerX + half30m, centerY - half30mY, // 右上
                centerX + half30m, centerY + half30mY, // 右下
                centerX - half30m, centerY + half30mY, // 左下
                centerX - half30m, centerY - half30mY, // 左上に戻る
              ]}
              stroke="#000000"
              strokeWidth={3}
              closed={true}
              listening={false}
            />
          );
        })()}
        
        {/* 中央の十字（濃く表示） - 背景の上 */}
        <Line
          points={[CANVAS_WIDTH_PX / 2, 0, CANVAS_WIDTH_PX / 2, CANVAS_HEIGHT_PX]}
          stroke="#1e293b"
          strokeWidth={4}
          listening={false}
        />
        <Line
          points={[0, CANVAS_HEIGHT_PX / 2, CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX / 2]}
          stroke="#1e293b"
          strokeWidth={4}
          listening={false}
        />

        {/* 外枠 - 背景の上 */}
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
          stroke="#1e293b"
          strokeWidth={2}
          closed={true}
          listening={false}
        />


        {/* ベジェアークのコントロール表示 */}
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
        {members.map((m, index) => {
          const pos = displayPositions[m.id];
          if (!pos) return null;

          const canvasPos = worldToCanvas(pos);
          const isSelected = selectedIds.includes(m.id);
          const playerId = `P${index + 1}`;

          return (
              <Group
              key={m.id}
              x={canvasPos.x}
              y={canvasPos.y}
              // ライン編集中（lineEditStateが有効）のときはメンバーをドラッグ不可にする
              draggable={!isPlaying && !activeArc && !lineEditState && !boxEditState}
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
              onMouseEnter={() => {
                setHoveredMemberId(m.id);
              }}
              onMouseLeave={() => {
                setHoveredMemberId(null);
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

              {/* プレイヤーID（×の下に表示） */}
              <Text 
                x={0} 
                y={12} 
                text={playerId} 
                fontSize={10} 
                fill="#1e293b" 
                fontStyle="bold"
                align="center"
                listening={false}
              />
              
              {/* ホバー時に名前を表示（ツールチップ） */}
              {hoveredMemberId === m.id && (() => {
                const fontSize = 12;
                const paddingX = 12;
                const paddingY = 6;
                const tooltipY = -35; // メンバーの上に表示
                
                // Canvas APIを使って実際のテキスト幅を測定
                const measureTextWidth = (text: string, font: string): number => {
                  // 一時的なCanvas要素を作成してテキスト幅を測定
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  if (!context) return text.length * fontSize * 0.7; // フォールバック
                  
                  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
                  const metrics = context.measureText(text);
                  return metrics.width;
                };
                
                // 実際のテキスト幅を測定
                const actualTextWidth = measureTextWidth(m.name, `600 ${fontSize}px`);
                const textHeight = fontSize + 2;
                // テキスト幅 + パディングでツールチップの幅を決定
                const totalWidth = actualTextWidth + paddingX * 2;
                
                return (
                  <Group>
                    {/* 影（背景の後ろに表示） */}
                    <Rect
                      x={-totalWidth / 2 + 1}
                      y={tooltipY + 1}
                      width={totalWidth}
                      height={textHeight + paddingY * 2}
                      fill="#000000"
                      opacity={0.3}
                      cornerRadius={6}
                      listening={false}
                    />
                    {/* 背景（グラデーション風） */}
                    <Rect
                      x={-totalWidth / 2}
                      y={tooltipY}
                      width={totalWidth}
                      height={textHeight + paddingY * 2}
                      fill="#1e293b"
                      opacity={0.95}
                      cornerRadius={6}
                      listening={false}
                    />
                    {/* 上部のアクセントライン */}
                    <Rect
                      x={-totalWidth / 2}
                      y={tooltipY}
                      width={totalWidth}
                      height={2}
                      fill="#10b981"
                      opacity={0.8}
                      cornerRadius={[6, 6, 0, 0]}
                      listening={false}
                    />
                    {/* テキスト（中央揃え） */}
                    <Text 
                      x={0} 
                      y={tooltipY + paddingY + 1} 
                      text={m.name} 
                      fontSize={fontSize} 
                      fill="#f1f5f9" 
                      fontStyle="600"
                      align="center"
                      verticalAlign="middle"
                      offsetX={actualTextWidth / 2}
                      listening={false}
                    />
                    {/* 矢印（メンバーへの接続） */}
                    <Line
                      points={[0, tooltipY + textHeight + paddingY * 2, 0, -10]}
                      stroke="#10b981"
                      strokeWidth={1.5}
                      opacity={0.6}
                      lineCap="round"
                      listening={false}
                    />
                    {/* 矢印の先端 */}
                    <Circle
                      x={0}
                      y={-10}
                      radius={2}
                      fill="#10b981"
                      opacity={0.8}
                      listening={false}
                    />
                  </Group>
                );
              })()}
            </Group>
          );
        })}

        {/* 横一列レイアウト編集用ハンドル（pendingPositions による未確定ラインを想定） */}
        {lineEditState && !isPlaying && !activeArc && onUpdateLineEdit && (() => {
          const { start, end } = lineEditState;
          const cStart = worldToCanvas(start);
          const cEnd = worldToCanvas(end);
          return (
            <>
              {/* ライン本体 */}
              <Line
                points={[cStart.x, cStart.y, cEnd.x, cEnd.y]}
                stroke="#38bdf8"
                strokeWidth={2}
                dash={[6, 4]}
                onMouseDown={(e: any) => {
                  // メンバー選択など下層へのイベント伝播を防ぐ
                  e.cancelBubble = true;
                }}
              />
              {/* 開始ハンドル */}
              <Circle
                x={cStart.x}
                y={cStart.y}
                radius={7}
                fill="#0ea5e9"
                stroke="#0369a1"
                strokeWidth={2}
                draggable
                onMouseDown={(e: any) => {
                  e.cancelBubble = true;
                }}
                onDragMove={(e: any) => {
                  const { x, y } = e.target.position();
                  const world = canvasToWorld(x, y);
                  onUpdateLineEdit(world, end);
                }}
              />
              {/* 終端ハンドル */}
              <Circle
                x={cEnd.x}
                y={cEnd.y}
                radius={7}
                fill="#0ea5e9"
                stroke="#0369a1"
                strokeWidth={2}
                draggable
                onMouseDown={(e: any) => {
                  e.cancelBubble = true;
                }}
                onDragMove={(e: any) => {
                  const { x, y } = e.target.position();
                  const world = canvasToWorld(x, y);
                  onUpdateLineEdit(start, world);
                }}
              />
            </>
          );
        })()}

        {/* ボックスレイアウト編集用ハンドル（四隅のドラッグで平行四辺形に変形） */}
        {boxEditState && !isPlaying && !activeArc && onUpdateBoxEdit && (() => {
          const { tl, tr, br, bl } = boxEditState;
          const cTL = worldToCanvas(tl);
          const cTR = worldToCanvas(tr);
          const cBR = worldToCanvas(br);
          const cBL = worldToCanvas(bl);

          return (
            <>
              {/* ボックスの輪郭 */}
              <Line
                points={[
                  cTL.x, cTL.y,
                  cTR.x, cTR.y,
                  cBR.x, cBR.y,
                  cBL.x, cBL.y,
                  cTL.x, cTL.y,
                ]}
                stroke="#22c55e"
                strokeWidth={2}
                dash={[6, 4]}
                closed
                onMouseDown={(e: any) => {
                  e.cancelBubble = true;
                }}
              />

              {/* 各コーナーハンドル */}
              {[
                { key: "tl", cx: cTL.x, cy: cTL.y },
                { key: "tr", cx: cTR.x, cy: cTR.y },
                { key: "br", cx: cBR.x, cy: cBR.y },
                { key: "bl", cx: cBL.x, cy: cBL.y },
              ].map(({ key, cx, cy }) => (
                <Circle
                  key={`box-corner-${key}`}
                  x={cx}
                  y={cy}
                  radius={7}
                  fill="#22c55e"
                  stroke="#166534"
                  strokeWidth={2}
                  draggable
                  onMouseDown={(e: any) => {
                    e.cancelBubble = true;
                  }}
                  onDragMove={(e: any) => {
                    const { x, y } = e.target.position();
                    const w = canvasToWorld(x, y);
                    const next = { tl, tr, br, bl };
                    if (key === "tl") next.tl = w;
                    if (key === "tr") next.tr = w;
                    if (key === "br") next.br = w;
                    if (key === "bl") next.bl = w;
                    onUpdateBoxEdit(next);
                  }}
                />
              ))}
            </>
          );
        })()}

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
          // 注意: displayPositionsではなくcurrentSetPositionsを使うことで、編集モードでの正確な中心を計算
          const selectedPositions = selectedIds
            .map((id) => currentSetPositions[id] || displayPositions[id])
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
                  // currentSetPositionsを使う（編集モードでの正確な位置）
                  rotationInitialPositionsRef.current = {};
                  selectedIds.forEach((id) => {
                    const pos = currentSetPositions[id] || displayPositions[id];
                    if (pos) {
                      rotationInitialPositionsRef.current![id] = { ...pos };
                    }
                  });
                }}
                onDragMove={(e: any) => {
                  if (
                    rotationStartAngleRef.current === null ||
                    !rotationCenterRef.current ||
                    !rotationInitialPositionsRef.current ||
                    !onRotateSelected
                  ) return;
                  
                  // 現在のマウス位置から角度を計算
                  const handlePos = e.target.position();
                  const handleWorld = canvasToWorld(handlePos.x / scale, handlePos.y / scale);
                  const dx = handleWorld.x - rotationCenterRef.current.x;
                  const dy = handleWorld.y - rotationCenterRef.current.y;
                  const currentAngle = Math.atan2(dy, dx);
                  
                  // 開始角度からの差分を計算（ハンドルの向きが角度そのもの）
                  // ハンドルが一周したら360°回転するようにする
                  let totalAngle = currentAngle - rotationStartAngleRef.current;
                  
                  // 角度の正規化（-π ～ π の範囲に）
                  if (totalAngle > Math.PI) totalAngle -= 2 * Math.PI;
                  if (totalAngle < -Math.PI) totalAngle += 2 * Math.PI;
                  
                  // onRotateSelectedコールバックで回転を適用（リアルタイム更新）
                  // 初期位置を基準に回転するため、累積を避ける
                  onRotateSelected(rotationCenterRef.current, totalAngle);
                  
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
                  // ドラッグ終了時に回転を確定
                  if (rotationInitialPositionsRef.current && rotationCenterRef.current && rotationStartAngleRef.current !== null && onRotateSelected) {
                    // 現在のハンドル位置から最終角度を取得
                    const handleElement = e.target;
                    const handlePos = handleElement.position();
                    const handleWorld = canvasToWorld(handlePos.x / scale, handlePos.y / scale);
                    const dx = handleWorld.x - rotationCenterRef.current.x;
                    const dy = handleWorld.y - rotationCenterRef.current.y;
                    const finalAngle = Math.atan2(dy, dx);
                    let totalAngle = finalAngle - rotationStartAngleRef.current;
                    
                    // 角度の正規化（-π ～ π の範囲に）
                    if (totalAngle > Math.PI) totalAngle -= 2 * Math.PI;
                    if (totalAngle < -Math.PI) totalAngle += 2 * Math.PI;
                    
                    // onRotateSelectedコールバックで回転を適用（選択メンバー全体を中心軸で回転）
                    onRotateSelected(rotationCenterRef.current, totalAngle);
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

        {/* グリッド（縦線） - グリッドは一番前に配置 */}
        {showGrid &&
          (() => {
            const lines = [];
            // フィールド全体をカバーするように、0からCANVAS_WIDTH_PXまでグリッド線を描画
            const maxX = CANVAS_WIDTH_PX;
            for (let x = 0; x <= maxX; x += stepPxX * gridInterval) {
              const stepIndex = Math.round(x / stepPxX);
              const isBold = stepIndex % 8 === 0;
              // 中央の線（x軸）は後で別途描画するのでスキップ
              const centerX = CANVAS_WIDTH_PX / 2;
              const isCenterLine = Math.abs(x - centerX) < stepPxX / 2; // 中央の線はスキップ

              if (isCenterLine) continue;

              lines.push(
                <Line
                  key={`v-${stepIndex}`}
                  points={[x, 0, x, CANVAS_HEIGHT_PX]}
                  stroke={isBold ? "#64748b" : "rgba(100,116,139,0.3)"}
                  strokeWidth={isBold ? 2 : 0.5}
                  listening={false}
                />
              );
            }
            return lines;
          })()}

        {/* グリッド（横線） - グリッドは一番前に配置 */}
        {showGrid &&
          (() => {
            const lines = [];
            // フィールド全体をカバーするように、0からCANVAS_HEIGHT_PXまでグリッド線を描画
            const maxY = CANVAS_HEIGHT_PX;
            for (let y = 0; y <= maxY; y += stepPxY * gridInterval) {
              const stepIndex = Math.round(y / stepPxY);
              const isBold = stepIndex % 8 === 0;
              // 中央の線（y軸）は後で別途描画するのでスキップ
              const centerY = CANVAS_HEIGHT_PX / 2;
              const isCenterLine = Math.abs(y - centerY) < stepPxY / 2; // 中央の線はスキップ

              if (isCenterLine) continue;

              lines.push(
                <Line
                  key={`h-${stepIndex}`}
                  points={[0, y, CANVAS_WIDTH_PX, y]}
                  stroke={isBold ? "#64748b" : "rgba(100,116,139,0.3)"}
                  strokeWidth={isBold ? 2 : 0.5}
                  listening={false}
                />
              );
            }
            return lines;
          })()}

        {/* カスタム太線 */}
        {boldLines.map((line) => {
          const centerX = CANVAS_WIDTH_PX / 2;
          const centerY = CANVAS_HEIGHT_PX / 2;
          
          if (line.type === "horizontal") {
            const y = centerY + line.position * stepPxY;
            const startX = centerX - (line.length * stepPxX) / 2;
            const endX = centerX + (line.length * stepPxX) / 2;
            return (
              <Line
                key={line.id}
                points={[startX, y, endX, y]}
                stroke="#64748b"
                strokeWidth={line.strokeWidth}
                listening={false}
              />
            );
          } else if (line.type === "vertical") {
            const x = centerX + line.position * stepPxX;
            const startY = centerY - (line.length * stepPxY) / 2;
            const endY = centerY + (line.length * stepPxY) / 2;
            return (
              <Line
                key={line.id}
                points={[x, startY, x, endY]}
                stroke="#64748b"
                strokeWidth={line.strokeWidth}
                listening={false}
              />
            );
          } else if (line.type === "diagonal") {
            const startX = centerX + line.start.x * stepPxX;
            const startY = centerY + line.start.y * stepPxY;
            const endX = centerX + line.end.x * stepPxX;
            const endY = centerY + line.end.y * stepPxY;
            return (
              <Line
                key={line.id}
                points={[startX, startY, endX, endY]}
                stroke="#64748b"
                strokeWidth={line.strokeWidth}
                listening={false}
              />
            );
          } else if (line.type === "arc") {
            const startX = centerX + line.start.x * stepPxX;
            const startY = centerY + line.start.y * stepPxY;
            const endX = centerX + line.end.x * stepPxX;
            const endY = centerY + line.end.y * stepPxY;
            const controlX = centerX + line.control.x * stepPxX;
            const controlY = centerY + line.control.y * stepPxY;
            // ベジェ曲線（二次）を描画
            return (
              <Shape
                key={line.id}
                sceneFunc={(context, shape) => {
                  context.beginPath();
                  context.moveTo(startX, startY);
                  context.quadraticCurveTo(controlX, controlY, endX, endY);
                  context.strokeStyle = "#64748b";
                  context.lineWidth = line.strokeWidth;
                  context.stroke();
                }}
                listening={false}
              />
            );
          }
          return null;
        })}
      </Layer>
    </Stage>
      </div>
    </div>
  );
});

export default FieldCanvas;
