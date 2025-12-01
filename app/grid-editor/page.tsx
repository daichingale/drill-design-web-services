// app/grid-editor/page.tsx
"use client";

import { useSettings, type BoldLine } from "@/context/SettingsContext";
import { useMenu } from "@/context/MenuContext";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STEP_M } from "@/lib/drill/utils";

// フィールドテンプレート（将来的に拡張可能）
type FieldTemplate = {
  id: string;
  name: string;
  width: number; // メートル
  height: number; // メートル
  description: string;
  gridInterval: number; // 推奨グリッド間隔
};

const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    id: "standard",
    name: "標準フットボールフィールド",
    width: 50,
    height: 40,
    description: "一般的なフットボールフィールドサイズ",
    gridInterval: 1,
  },
  {
    id: "large-gym",
    name: "大型体育館（30m）",
    width: 30,
    height: 30,
    description: "30m × 30m の大型体育館",
    gridInterval: 1,
  },
  {
    id: "medium-gym",
    name: "中型体育館（20m）",
    width: 20,
    height: 20,
    description: "20m × 20m の中型体育館",
    gridInterval: 1,
  },
  {
    id: "small-stage",
    name: "小さなステージ（10m）",
    width: 10,
    height: 10,
    description: "10m × 10m の小さなステージ",
    gridInterval: 1,
  },
  {
    id: "custom",
    name: "カスタム",
    width: 0,
    height: 0,
    description: "自由にサイズを設定",
    gridInterval: 1,
  },
];

export default function GridEditorPage() {
  const { settings, updateSettings } = useSettings();
  const { setMenuGroups } = useMenu();
  const router = useRouter();
  
  const [localFieldWidth, setLocalFieldWidth] = useState(settings.fieldWidth);
  const [localFieldHeight, setLocalFieldHeight] = useState(settings.fieldHeight);
  const [localGridInterval, setLocalGridInterval] = useState(settings.gridInterval);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  
  // 太線の管理（Settingsから読み込み）
  const [boldLines, setBoldLines] = useState<BoldLine[]>(settings.boldLines || []);
  const [drawingMode, setDrawingMode] = useState<"horizontal" | "vertical" | "diagonal" | "arc" | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; y: number } | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState<"start" | "end" | "control" | null>(null);
  const [draggedLineId, setDraggedLineId] = useState<string | null>(null);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  
  // Settingsから太線を読み込む（初回のみ、または外部からの変更時）
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setBoldLines(settings.boldLines || []);
    }
  }, []); // 初回マウント時のみ
  
  // 太線を更新する関数
  const updateBoldLines = useCallback((newLines: BoldLine[] | ((prev: BoldLine[]) => BoldLine[])) => {
    setBoldLines((prev) => {
      return typeof newLines === "function" ? newLines(prev) : newLines;
    });
  }, []);
  
  // 太線の変更をSettingsに保存（ドラッグ中は遅延、それ以外は即座）
  const prevBoldLinesRef = useRef<BoldLine[]>(boldLines);
  const prevDraggingLineIdRef = useRef<string | null>(null);
  const updateSettingsRef = useRef(updateSettings);
  updateSettingsRef.current = updateSettings;
  
  useEffect(() => {
    // ドラッグ中でない場合、またはドラッグが終了した場合のみ保存
    const isDraggingEnded = prevDraggingLineIdRef.current !== null && draggingLineId === null;
    const hasChanged = JSON.stringify(prevBoldLinesRef.current) !== JSON.stringify(boldLines);
    
    if ((!draggingLineId || isDraggingEnded) && hasChanged) {
      updateSettingsRef.current({ boldLines });
      prevBoldLinesRef.current = boldLines;
    }
    
    prevDraggingLineIdRef.current = draggingLineId;
  }, [boldLines, draggingLineId]); // updateSettingsを依存配列から除外

  // テンプレートが選択されたら、フィールドサイズを更新
  useEffect(() => {
    const template = FIELD_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template && template.id !== "custom") {
      setLocalFieldWidth(template.width);
      setLocalFieldHeight(template.height);
      setLocalGridInterval(template.gridInterval);
    }
  }, [selectedTemplate]);

  // 現在の設定がどのテンプレートに近いか判定
  useEffect(() => {
    const matchingTemplate = FIELD_TEMPLATES.find(
      (t) =>
        t.id !== "custom" &&
        Math.abs(t.width - settings.fieldWidth) < 1 &&
        Math.abs(t.height - settings.fieldHeight) < 1
    );
    if (matchingTemplate) {
      setSelectedTemplate(matchingTemplate.id);
    } else {
      setSelectedTemplate("custom");
    }
  }, [settings.fieldWidth, settings.fieldHeight]);

  // フィールドサイズの変更をリアルタイム反映
  useEffect(() => {
    updateSettings({
      fieldWidth: localFieldWidth,
      fieldHeight: localFieldHeight,
    });
  }, [localFieldWidth, localFieldHeight, updateSettings]);

  // グリッド間隔の変更をリアルタイム反映
  useEffect(() => {
    updateSettings({
      gridInterval: localGridInterval,
    });
  }, [localGridInterval, updateSettings]);

  // ステップ数とメートルの計算
  const STEP_M = 5 / 8; // 1ステップ = 0.625m
  const totalStepsX = useMemo(
    () => Math.round(localFieldWidth / STEP_M),
    [localFieldWidth]
  );
  const totalStepsY = useMemo(
    () => Math.round(localFieldHeight / STEP_M),
    [localFieldHeight]
  );

  // メニューグループをレイアウトのメニューバーに登録
  useEffect(() => {
    const menuGroups = [
      {
        label: "ファイル",
        items: [
          {
            label: "ドリルエディタに戻る",
            icon: "📝",
            action: () => router.push("/drill"),
          },
          {
            label: "設定に戻る",
            icon: "⚙️",
            action: () => router.push("/settings"),
          },
        ],
      },
    ];

    setMenuGroups(menuGroups);
    return () => {
      setMenuGroups([]);
    };
  }, [setMenuGroups, router]);

  return (
    <div className="space-y-8">
      {/* ヘッダーセクション */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← 設定に戻る
          </Link>
          <span className="text-slate-600">|</span>
          <Link
            href="/drill"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ドリルエディタ
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          グリッドエディタ
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          フィールドサイズとグリッド設定を自由にカスタマイズできます。
          30mの大型体育館から小さなステージまで、様々なサイズに対応できます。
        </p>
      </section>

      {/* テンプレート選択 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          フィールドテンプレート
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELD_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedTemplate === template.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-800/80 hover:border-slate-600"
              }`}
            >
              <div className="font-medium text-slate-200 mb-1">
                {template.name}
              </div>
              <div className="text-xs text-slate-400">
                {template.description}
              </div>
              {template.id !== "custom" && (
                <div className="text-xs text-slate-300 mt-2">
                  {template.width}m × {template.height}m
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* フィールドサイズ設定 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          フィールドサイズ
        </h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                フィールド幅（m）
              </label>
              <input
                type="number"
                value={localFieldWidth}
                onChange={(e) => setLocalFieldWidth(Number(e.target.value))}
                min={5}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-xs text-slate-400">
                約 {totalStepsX} ステップ（{localFieldWidth.toFixed(2)}m）
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                フィールド高さ（m）
              </label>
              <input
                type="number"
                value={localFieldHeight}
                onChange={(e) => setLocalFieldHeight(Number(e.target.value))}
                min={5}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-xs text-slate-400">
                約 {totalStepsY} ステップ（{localFieldHeight.toFixed(2)}m）
              </p>
            </div>
          </div>

          {/* プレビュー */}
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-slate-300">
                フィールドプレビュー
              </div>
              <div className="flex items-center gap-2">
                {drawingMode ? (
                  <button
                    onClick={() => {
                      setDrawingMode(null);
                      setDrawingStart(null);
                      setDrawingCurrent(null);
                    }}
                    className="text-xs px-3 py-1 rounded bg-red-600 text-white"
                  >
                    ✕ キャンセル
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDrawingMode("horizontal")}
                      className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                      title="横線"
                    >
                      ─
                    </button>
                    <button
                      onClick={() => setDrawingMode("vertical")}
                      className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                      title="縦線"
                    >
                      │
                    </button>
                    <button
                      onClick={() => setDrawingMode("diagonal")}
                      className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                      title="斜め線"
                    >
                      ╱
                    </button>
                    <button
                      onClick={() => setDrawingMode("arc")}
                      className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                      title="弧"
                    >
                      ⌒
                    </button>
                  </div>
                )}
              </div>
            </div>
            {(() => {
              // FieldCanvasと同じ計算ロジックを使用
              const PREVIEW_WIDTH_PX = 400; // プレビュー用の基準幅
              const PREVIEW_HEIGHT_PX = (localFieldHeight / localFieldWidth) * PREVIEW_WIDTH_PX;
              const baseScaleX = PREVIEW_WIDTH_PX / localFieldWidth;
              const baseScaleY = PREVIEW_HEIGHT_PX / localFieldHeight;
              const stepPxX = STEP_M * baseScaleX;
              const stepPxY = STEP_M * baseScaleY;
              const centerX = PREVIEW_WIDTH_PX / 2;
              const centerY = PREVIEW_HEIGHT_PX / 2;
              
              // 座標をステップに変換（中心からの距離）
              const pxToStepX = (px: number) => (px - centerX) / stepPxX;
              const pxToStepY = (px: number) => (px - centerY) / stepPxY;
              const stepToPxX = (step: number) => centerX + step * stepPxX;
              const stepToPxY = (step: number) => centerY + step * stepPxY;
              
              // ステップにスナップ
              const snapToStep = (value: number) => Math.round(value);
              
              // プレビュー内のクリック位置を取得
              const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
                if (!drawingMode || !previewRef.current) return;
                const rect = previewRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                const y = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                setDrawingStart({ x, y });
              };
              
              const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                if (editingLineId && editingHandle && previewRef.current) {
                  // ハンドル編集モード
                  const rect = previewRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                  const y = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                  const newX = snapToStep(pxToStepX(x));
                  const newY = snapToStep(pxToStepY(y));
                  
                  updateBoldLines((prev) =>
                    prev.map((line) => {
                      if (line.id !== editingLineId) return line;
                      if (line.type === "diagonal" || line.type === "arc") {
                        if (editingHandle === "start") {
                          return { ...line, start: { x: newX, y: newY } };
                        } else if (editingHandle === "end") {
                          return { ...line, end: { x: newX, y: newY } };
                        } else if (editingHandle === "control" && line.type === "arc") {
                          return { ...line, control: { x: newX, y: newY } };
                        }
                      } else if (line.type === "horizontal") {
                        if (editingHandle === "start") {
                          // 左端を移動（長さと位置を調整）
                          const currentStartY = line.position - line.length / 2;
                          const newStartY = newY;
                          const currentEndY = line.position + line.length / 2;
                          const newLength = Math.abs(currentEndY - newStartY) * 2;
                          const newPosition = (newStartY + currentEndY) / 2;
                          return { ...line, position: newPosition, length: Math.max(1, newLength) };
                        } else if (editingHandle === "end") {
                          // 右端を移動（長さを調整）
                          const currentStartY = line.position - line.length / 2;
                          const newEndY = newY;
                          const newLength = Math.abs(newEndY - currentStartY) * 2;
                          return { ...line, length: Math.max(1, newLength) };
                        }
                      } else if (line.type === "vertical") {
                        if (editingHandle === "start") {
                          // 上端を移動（長さと位置を調整）
                          const currentStartX = line.position - line.length / 2;
                          const newStartX = newX;
                          const currentEndX = line.position + line.length / 2;
                          const newLength = Math.abs(currentEndX - newStartX) * 2;
                          const newPosition = (newStartX + currentEndX) / 2;
                          return { ...line, position: newPosition, length: Math.max(1, newLength) };
                        } else if (editingHandle === "end") {
                          // 下端を移動（長さを調整）
                          const currentStartX = line.position - line.length / 2;
                          const newEndX = newX;
                          const newLength = Math.abs(newEndX - currentStartX) * 2;
                          return { ...line, length: Math.max(1, newLength) };
                        }
                      }
                      return line;
                    })
                  );
                } else if (draggingLineId && previewRef.current) {
                  // 斜め線・弧の移動モード
                  const line = boldLines.find((l) => l.id === draggingLineId);
                  if (line && (line.type === "diagonal" || line.type === "arc") && dragOffset) {
                    const rect = previewRef.current.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                    const mouseY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                    const newStartX = snapToStep(pxToStepX(mouseX - dragOffset.x));
                    const newStartY = snapToStep(pxToStepY(mouseY - dragOffset.y));
                    const deltaX = newStartX - line.start.x;
                    const deltaY = newStartY - line.start.y;
                    
                    updateBoldLines((prev) =>
                      prev.map((l) => {
                        if (l.id !== draggingLineId) return l;
                        if (l.type === "diagonal") {
                          return {
                            ...l,
                            start: { x: newStartX, y: newStartY },
                            end: { x: l.end.x + deltaX, y: l.end.y + deltaY },
                          };
                        } else if (l.type === "arc") {
                          return {
                            ...l,
                            start: { x: newStartX, y: newStartY },
                            end: { x: l.end.x + deltaX, y: l.end.y + deltaY },
                            control: { x: l.control.x + deltaX, y: l.control.y + deltaY },
                          };
                        }
                        return l;
                      })
                    );
                  }
                } else if (drawingMode && drawingStart && previewRef.current) {
                  // 描画モード
                  const rect = previewRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                  const y = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                  setDrawingCurrent({ x, y });
                }
              };
              
              const handlePreviewMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
                if (editingLineId && editingHandle) {
                  // ハンドル編集終了
                  setEditingHandle(null);
                  return;
                }
                if (draggingLineId) {
                  // ドラッグ終了（横線・縦線・斜め線・弧すべて）
                  setDraggingLineId(null);
                  setDragOffset(null);
                  return;
                }
                
                if (!drawingMode || !drawingStart || !previewRef.current) return;
                const rect = previewRef.current.getBoundingClientRect();
                const endX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                const endY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                
                const startStepX = snapToStep(pxToStepX(drawingStart.x));
                const startStepY = snapToStep(pxToStepY(drawingStart.y));
                const endStepX = snapToStep(pxToStepX(endX));
                const endStepY = snapToStep(pxToStepY(endY));
                
                const dx = Math.abs(endStepX - startStepX);
                const dy = Math.abs(endStepY - startStepY);
                
                // 最小長さチェック
                if (dx < 1 && dy < 1) {
                  setDrawingMode(null);
                  setDrawingStart(null);
                  setDrawingCurrent(null);
                  return;
                }
                
                if (drawingMode === "horizontal") {
                  const y = (startStepY + endStepY) / 2;
                  const length = Math.abs(endStepX - startStepX);
                  if (length > 0) {
                    const newLine: BoldLine = {
                      id: `line-${Date.now()}`,
                      type: "horizontal",
                      position: y,
                      length: length,
                      strokeWidth: 2,
                    };
                    updateBoldLines([...boldLines, newLine]);
                    setEditingLineId(newLine.id); // 自動的に選択状態にする
                  }
                } else if (drawingMode === "vertical") {
                  const x = (startStepX + endStepX) / 2;
                  const length = Math.abs(endStepY - startStepY);
                  if (length > 0) {
                    const newLine: BoldLine = {
                      id: `line-${Date.now()}`,
                      type: "vertical",
                      position: x,
                      length: length,
                      strokeWidth: 2,
                    };
                    updateBoldLines([...boldLines, newLine]);
                    setEditingLineId(newLine.id); // 自動的に選択状態にする
                  }
                } else if (drawingMode === "diagonal") {
                  const newLine: BoldLine = {
                    id: `line-${Date.now()}`,
                    type: "diagonal",
                    start: { x: startStepX, y: startStepY },
                    end: { x: endStepX, y: endStepY },
                    strokeWidth: 2,
                  };
                  updateBoldLines([...boldLines, newLine]);
                  setEditingLineId(newLine.id); // 自動的に選択状態にする
                } else if (drawingMode === "arc") {
                  // 弧の場合、制御点は開始点と終了点の中点から少し上に配置
                  const midX = (startStepX + endStepX) / 2;
                  const midY = (startStepY + endStepY) / 2;
                  const controlX = midX;
                  const controlY = midY - Math.abs(endStepY - startStepY) * 0.3; // 少し上に
                  const newLine: BoldLine = {
                    id: `line-${Date.now()}`,
                    type: "arc",
                    start: { x: startStepX, y: startStepY },
                    end: { x: endStepX, y: endStepY },
                    control: { x: controlX, y: controlY },
                    strokeWidth: 2,
                  };
                  updateBoldLines([...boldLines, newLine]);
                  setEditingLineId(newLine.id); // 自動的に選択状態にする
                }
                
                setDrawingMode(null);
                setDrawingStart(null);
                setDrawingCurrent(null);
              };
              
              // プレビューからマウスが離れたとき
              const handlePreviewMouseLeave = () => {
                if (drawingMode) {
                  setDrawingMode(null);
                  setDrawingStart(null);
                  setDrawingCurrent(null);
                }
                if (editingLineId) {
                  setEditingLineId(null);
                  setEditingHandle(null);
                }
              };
              
              // 太線をクリック（選択用）
              const handleLineClick = (e: React.MouseEvent, lineId: string) => {
                if (drawingMode) return;
                e.stopPropagation();
                setEditingLineId(lineId);
                setEditingHandle(null);
              };
              
              // 太線をドラッグ開始（位置変更用）
              const handleLineMouseDown = (e: React.MouseEvent, lineId: string) => {
                if (drawingMode) return; // 描画モード中は無効
                e.stopPropagation();
                const line = boldLines.find((l) => l.id === lineId);
                if (!line || !previewRef.current) return;
                
                // まず選択状態にする
                setEditingLineId(lineId);
                setEditingHandle(null);
                
                // 横線・縦線のみドラッグで位置変更可能
                if (line.type !== "horizontal" && line.type !== "vertical") return;
                
                const rect = previewRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                const mouseY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                
                // 現在の線の位置を計算
                if (line.type === "horizontal") {
                  const currentPos = stepToPxY(line.position);
                  setDragOffset({ x: 0, y: mouseY - currentPos });
                } else {
                  const currentPos = stepToPxX(line.position);
                  setDragOffset({ x: mouseX - currentPos, y: 0 });
                }
                
                setDraggingLineId(lineId);
              };
              
              // 太線をドラッグ中（位置変更） - 横線・縦線のみ
              const handleLineMouseMove = (e: React.MouseEvent) => {
                if (!draggingLineId || !dragOffset || !previewRef.current) return;
                const line = boldLines.find((l) => l.id === draggingLineId);
                if (!line) return;
                
                // 横線・縦線のみ位置変更
                if (line.type !== "horizontal" && line.type !== "vertical") return;
                
                const rect = previewRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                const mouseY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                
                if (line.type === "horizontal") {
                  const newY = mouseY - dragOffset.y;
                  const newPosition = snapToStep(pxToStepY(newY));
                  updateBoldLines(
                    boldLines.map((l) =>
                      l.id === draggingLineId ? { ...l, position: newPosition } : l
                    )
                  );
                } else {
                  const newX = mouseX - dragOffset.x;
                  const newPosition = snapToStep(pxToStepX(newX));
                  updateBoldLines(
                    boldLines.map((l) =>
                      l.id === draggingLineId ? { ...l, position: newPosition } : l
                    )
                  );
                }
              };
              
              // 太線のドラッグ終了
              const handleLineMouseUp = () => {
                setDraggingLineId(null);
                setDragOffset(null);
              };
              
              // 太線をドラッグ開始（ゴミ箱用）
              const handleLineDragStart = (e: React.DragEvent, lineId: string) => {
                if (drawingMode) {
                  e.preventDefault();
                  return;
                }
                e.stopPropagation();
                setDraggedLineId(lineId);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", lineId);
              };
              
              // ドラッグ終了（ゴミ箱にドロップしなかった場合）
              const handleLineDragEnd = () => {
                setDraggedLineId(null);
              };
              
              // ゴミ箱にドロップ
              const handleTrashDrop = (e: React.DragEvent) => {
                e.preventDefault();
                const lineId = e.dataTransfer.getData("text/plain");
                if (lineId) {
                  updateBoldLines(boldLines.filter((line) => line.id !== lineId));
                }
                setDraggedLineId(null);
              };
              
              const handleTrashDragOver = (e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              };
              
              const handleTrashDragEnter = (e: React.DragEvent) => {
                e.preventDefault();
              };
              
              const handleTrashDragLeave = (e: React.DragEvent) => {
                e.preventDefault();
              };
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full" style={{ minHeight: `${Math.min(PREVIEW_HEIGHT_PX, 400)}px` }}>
                    <div
                      ref={previewRef}
                      className="relative bg-slate-800 rounded border border-slate-700 overflow-visible shadow-lg cursor-crosshair"
                      style={{ width: `${PREVIEW_WIDTH_PX}px`, height: `${Math.min(PREVIEW_HEIGHT_PX, 400)}px` }}
                      onMouseDown={(e) => {
                        handlePreviewMouseDown(e);
                      }}
                      onMouseMove={(e) => {
                        handlePreviewMouseMove(e);
                        if (draggingLineId) {
                          const line = boldLines.find((l) => l.id === draggingLineId);
                          if (line && (line.type === "horizontal" || line.type === "vertical")) {
                            handleLineMouseMove(e);
                          }
                        }
                      }}
                      onMouseUp={(e) => {
                        if (draggingLineId) {
                          handleLineMouseUp();
                        } else {
                          handlePreviewMouseUp(e);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (draggingLineId) {
                          handleLineMouseUp();
                        } else {
                          handlePreviewMouseLeave();
                        }
                      }}
                    >
                      {/* グリッド背景 */}
                      <div
                        className="absolute"
                        style={{
                          width: `${PREVIEW_WIDTH_PX}px`,
                          height: `${PREVIEW_HEIGHT_PX}px`,
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          backgroundImage: settings.showGrid
                            ? `linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`
                            : "none",
                          backgroundSize: settings.showGrid
                            ? `${stepPxX * localGridInterval}px ${stepPxY * localGridInterval}px`
                            : "auto",
                        }}
                      />
                      
                      {/* ドラッグ中の線を表示 */}
                      {drawingMode && drawingStart && drawingCurrent && (
                        (() => {
                          if (drawingMode === "diagonal") {
                            return (
                              <svg
                                className="absolute pointer-events-none z-20"
                                style={{ width: `${PREVIEW_WIDTH_PX}px`, height: `${Math.min(PREVIEW_HEIGHT_PX, 400)}px` }}
                              >
                                <line
                                  x1={drawingStart.x}
                                  y1={drawingStart.y}
                                  x2={drawingCurrent.x}
                                  y2={drawingCurrent.y}
                                  stroke="rgba(100, 116, 139, 0.5)"
                                  strokeWidth="2"
                                />
                              </svg>
                            );
                          } else if (drawingMode === "arc") {
                            const midX = (drawingStart.x + drawingCurrent.x) / 2;
                            const midY = (drawingStart.y + drawingCurrent.y) / 2;
                            const controlX = midX;
                            const controlY = midY - Math.abs(drawingCurrent.y - drawingStart.y) * 0.3;
                            return (
                              <svg
                                className="absolute pointer-events-none z-20"
                                style={{ width: `${PREVIEW_WIDTH_PX}px`, height: `${Math.min(PREVIEW_HEIGHT_PX, 400)}px` }}
                              >
                                <path
                                  d={`M ${drawingStart.x} ${drawingStart.y} Q ${controlX} ${controlY} ${drawingCurrent.x} ${drawingCurrent.y}`}
                                  stroke="rgba(100, 116, 139, 0.5)"
                                  strokeWidth="2"
                                  fill="none"
                                />
                              </svg>
                            );
                          } else {
                            const dx = Math.abs(drawingCurrent.x - drawingStart.x);
                            const dy = Math.abs(drawingCurrent.y - drawingStart.y);
                            if (dx > dy) {
                              // 横線
                              const y = (drawingStart.y + drawingCurrent.y) / 2;
                              const startX = Math.min(drawingStart.x, drawingCurrent.x);
                              const endX = Math.max(drawingStart.x, drawingCurrent.x);
                              return (
                                <div
                                  className="absolute pointer-events-none z-20"
                                  style={{
                                    left: `${startX}px`,
                                    top: `${y}px`,
                                    width: `${endX - startX}px`,
                                    height: "2px",
                                    backgroundColor: "rgba(100, 116, 139, 0.5)",
                                    transform: "translateY(-50%)",
                                  }}
                                />
                              );
                            } else {
                              // 縦線
                              const x = (drawingStart.x + drawingCurrent.x) / 2;
                              const startY = Math.min(drawingStart.y, drawingCurrent.y);
                              const endY = Math.max(drawingStart.y, drawingCurrent.y);
                              return (
                                <div
                                  className="absolute pointer-events-none z-20"
                                  style={{
                                    left: `${x}px`,
                                    top: `${startY}px`,
                                    width: "2px",
                                    height: `${endY - startY}px`,
                                    backgroundColor: "rgba(100, 116, 139, 0.5)",
                                    transform: "translateX(-50%)",
                                  }}
                                />
                              );
                            }
                          }
                        })()
                      )}
                      
                      {/* 太線を表示（SVG要素 - 斜め線・弧のみ） */}
                      <svg
                        className="absolute z-10"
                        style={{ width: `${PREVIEW_WIDTH_PX}px`, height: `${Math.min(PREVIEW_HEIGHT_PX, 400)}px`, pointerEvents: "auto" }}
                      >
                        {boldLines.map((line) => {
                          if (line.type === "diagonal") {
                          const startX = stepToPxX(line.start.x);
                          const startY = stepToPxY(line.start.y);
                          const endX = stepToPxX(line.end.x);
                          const endY = stepToPxY(line.end.y);
                          const isSelected = editingLineId === line.id;
                          return (
                            <g key={line.id}>
                              <line
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke="#64748b"
                                strokeWidth={line.strokeWidth}
                                style={{ cursor: "move", pointerEvents: "auto" }}
                                onMouseDown={(e) => {
                                  if (!drawingMode) {
                                    e.stopPropagation();
                                    setEditingLineId(line.id);
                                    setEditingHandle(null);
                                    // 移動用のドラッグ開始
                                    const rect = previewRef.current?.getBoundingClientRect();
                                    if (rect) {
                                      const mouseX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                                      const mouseY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                                      setDragOffset({ x: mouseX - startX, y: mouseY - startY });
                                      setDraggingLineId(line.id);
                                    }
                                  }
                                }}
                              />
                              {isSelected && (
                                <>
                                  <circle
                                    cx={startX}
                                    cy={startY}
                                    r={6}
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingLineId(line.id);
                                      setEditingHandle("start");
                                    }}
                                  />
                                  <circle
                                    cx={endX}
                                    cy={endY}
                                    r={6}
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingLineId(line.id);
                                      setEditingHandle("end");
                                    }}
                                  />
                                  {/* 太さ編集UI */}
                                  <foreignObject
                                    x={(startX + endX) / 2 - 50}
                                    y={Math.max(startY, endY) + 15}
                                    width={100}
                                    height={30}
                                  >
                                    <div className="flex items-center gap-2 bg-slate-900/90 px-2 py-1 rounded text-xs text-slate-200">
                                      <span>太さ</span>
                                      <input
                                        type="number"
                                        value={line.strokeWidth}
                                        onChange={(e) => {
                                          const newWidth = Math.max(1, Math.min(10, Number(e.target.value)));
                                          updateBoldLines(
                                            boldLines.map((l) =>
                                              l.id === line.id ? { ...l, strokeWidth: newWidth } : l
                                            )
                                          );
                                        }}
                                        min={1}
                                        max={10}
                                        className="w-12 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span>px</span>
                                    </div>
                                  </foreignObject>
                                </>
                              )}
                            </g>
                          );
                        } else if (line.type === "arc") {
                          const startX = stepToPxX(line.start.x);
                          const startY = stepToPxY(line.start.y);
                          const endX = stepToPxX(line.end.x);
                          const endY = stepToPxY(line.end.y);
                          const controlX = stepToPxX(line.control.x);
                          const controlY = stepToPxY(line.control.y);
                          const isSelected = editingLineId === line.id;
                          return (
                            <g key={line.id}>
                              <path
                                d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                                stroke="#64748b"
                                strokeWidth={line.strokeWidth}
                                fill="none"
                                style={{ cursor: "move", pointerEvents: "auto" }}
                                onMouseDown={(e) => {
                                  if (!drawingMode) {
                                    e.stopPropagation();
                                    setEditingLineId(line.id);
                                    setEditingHandle(null);
                                    // 移動用のドラッグ開始
                                    const rect = previewRef.current?.getBoundingClientRect();
                                    if (rect) {
                                      const mouseX = e.clientX - rect.left - (rect.width - PREVIEW_WIDTH_PX) / 2;
                                      const mouseY = e.clientY - rect.top - (rect.height - Math.min(PREVIEW_HEIGHT_PX, 400)) / 2;
                                      setDragOffset({ x: mouseX - startX, y: mouseY - startY });
                                      setDraggingLineId(line.id);
                                    }
                                  }
                                }}
                              />
                              {isSelected && (
                                <>
                                  <circle
                                    cx={startX}
                                    cy={startY}
                                    r={6}
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingLineId(line.id);
                                      setEditingHandle("start");
                                    }}
                                  />
                                  <circle
                                    cx={endX}
                                    cy={endY}
                                    r={6}
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingLineId(line.id);
                                      setEditingHandle("end");
                                    }}
                                  />
                                  <circle
                                    cx={controlX}
                                    cy={controlY}
                                    r={6}
                                    fill="#10b981"
                                    stroke="white"
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingLineId(line.id);
                                      setEditingHandle("control");
                                    }}
                                  />
                                  {/* 太さ編集UI */}
                                  <foreignObject
                                    x={(startX + endX) / 2 - 50}
                                    y={Math.max(startY, endY, controlY) + 15}
                                    width={100}
                                    height={30}
                                  >
                                    <div className="flex items-center gap-2 bg-slate-900/90 px-2 py-1 rounded text-xs text-slate-200">
                                      <span>太さ</span>
                                      <input
                                        type="number"
                                        value={line.strokeWidth}
                                        onChange={(e) => {
                                          const newWidth = Math.max(1, Math.min(10, Number(e.target.value)));
                                          updateBoldLines(
                                            boldLines.map((l) =>
                                              l.id === line.id ? { ...l, strokeWidth: newWidth } : l
                                            )
                                          );
                                        }}
                                        min={1}
                                        max={10}
                                        className="w-12 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span>px</span>
                                    </div>
                                  </foreignObject>
                                </>
                              )}
                            </g>
                          );
                        }
                          return null;
                        })}
                      </svg>
                      
                      {/* 太線を表示（横線・縦線） */}
                      {boldLines.map((line) => {
                        if (line.type !== "horizontal" && line.type !== "vertical") return null;
                        
                        if (line.type === "horizontal") {
                          const y = stepToPxY(line.position);
                          const startX = centerX - (line.length * stepPxX) / 2;
                          const endX = centerX + (line.length * stepPxX) / 2;
                          const isSelected = editingLineId === line.id;
                          return (
                            <div key={line.id} className="absolute" style={{ left: `${startX}px`, top: `${y}px`, transform: "translateY(-50%)" }}>
                              {/* 位置変更用のドラッグエリア */}
                              <div
                                onMouseDown={(e) => {
                                  if (!drawingMode) {
                                    e.stopPropagation();
                                    handleLineMouseDown(e, line.id);
                                  }
                                }}
                                onClick={(e) => {
                                  if (!drawingMode && !draggingLineId) {
                                    e.stopPropagation();
                                    setEditingLineId(line.id);
                                    setEditingHandle(null);
                                  }
                                }}
                                className={`cursor-move hover:opacity-80 transition-opacity ${
                                  draggingLineId === line.id ? "opacity-50" : ""
                                }`}
                                style={{
                                  width: `${endX - startX}px`,
                                  height: `${line.strokeWidth}px`,
                                  backgroundColor: "#64748b",
                                  pointerEvents: "auto",
                                }}
                              />
                              {/* ゴミ箱用のドラッグハンドル */}
                              <div
                                draggable={!drawingMode}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleLineDragStart(e, line.id);
                                }}
                                onDragEnd={handleLineDragEnd}
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-3 h-3 bg-blue-500 rounded-full cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity z-20"
                                style={{ pointerEvents: "auto" }}
                                title="ゴミ箱にドラッグして削除"
                              />
                              {isSelected && (
                                <>
                                  {/* 長さ調整ハンドル（左端） */}
                                  <div
                                    className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize border-2 border-white z-20"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingHandle("start");
                                    }}
                                    title="長さを調整"
                                  />
                                  {/* 長さ調整ハンドル（右端） */}
                                  <div
                                    className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize border-2 border-white z-20"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingHandle("end");
                                    }}
                                    title="長さを調整"
                                  />
                                  {/* 太さ編集UI */}
                                  <div
                                    className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 px-2 py-1 rounded text-xs text-slate-200 whitespace-nowrap z-20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>太さ</span>
                                    <input
                                      type="number"
                                      value={line.strokeWidth}
                                      onChange={(e) => {
                                        const newWidth = Math.max(1, Math.min(10, Number(e.target.value)));
                                        updateBoldLines(
                                          boldLines.map((l) =>
                                            l.id === line.id ? { ...l, strokeWidth: newWidth } : l
                                          )
                                        );
                                      }}
                                      min={1}
                                      max={10}
                                      className="w-12 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span>px</span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        } else if (line.type === "vertical") {
                          const x = stepToPxX(line.position);
                          const startY = centerY - (line.length * stepPxY) / 2;
                          const endY = centerY + (line.length * stepPxY) / 2;
                          const isSelected = editingLineId === line.id;
                          return (
                            <div key={line.id} className="absolute" style={{ left: `${x}px`, top: `${startY}px`, transform: "translateX(-50%)" }}>
                              {/* 位置変更用のドラッグエリア */}
                              <div
                                onMouseDown={(e) => {
                                  if (!drawingMode) {
                                    e.stopPropagation();
                                    handleLineMouseDown(e, line.id);
                                  }
                                }}
                                onClick={(e) => {
                                  if (!drawingMode && !draggingLineId) {
                                    e.stopPropagation();
                                    setEditingLineId(line.id);
                                    setEditingHandle(null);
                                  }
                                }}
                                className={`cursor-move hover:opacity-80 transition-opacity ${
                                  draggingLineId === line.id ? "opacity-50" : ""
                                }`}
                                style={{
                                  width: `${line.strokeWidth}px`,
                                  pointerEvents: "auto",
                                  height: `${endY - startY}px`,
                                  backgroundColor: "#64748b",
                                }}
                              />
                              {/* ゴミ箱用のドラッグハンドル */}
                              <div
                                draggable={!drawingMode}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleLineDragStart(e, line.id);
                                }}
                                onDragEnd={handleLineDragEnd}
                                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 w-3 h-3 bg-blue-500 rounded-full cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity z-20"
                                style={{ pointerEvents: "auto" }}
                                title="ゴミ箱にドラッグして削除"
                              />
                              {isSelected && (
                                <>
                                  {/* 長さ調整ハンドル（上端） */}
                                  <div
                                    className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ns-resize border-2 border-white z-20"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingHandle("start");
                                    }}
                                    title="長さを調整"
                                  />
                                  {/* 長さ調整ハンドル（下端） */}
                                  <div
                                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-ns-resize border-2 border-white z-20"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setEditingHandle("end");
                                    }}
                                    title="長さを調整"
                                  />
                                  {/* 太さ編集UI */}
                                  <div
                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2 bg-slate-900/90 px-2 py-1 rounded text-xs text-slate-200 whitespace-nowrap z-20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>太さ</span>
                                    <input
                                      type="number"
                                      value={line.strokeWidth}
                                      onChange={(e) => {
                                        const newWidth = Math.max(1, Math.min(10, Number(e.target.value)));
                                        updateBoldLines(
                                          boldLines.map((l) =>
                                            l.id === line.id ? { ...l, strokeWidth: newWidth } : l
                                          )
                                        );
                                      }}
                                      min={1}
                                      max={10}
                                      className="w-12 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span>px</span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                      
                      {/* 情報ラベル */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-xs text-slate-400 text-center bg-slate-900/80 px-3 py-2 rounded backdrop-blur-sm">
                          <div className="font-medium">
                            {localFieldWidth.toFixed(1)}m × {localFieldHeight.toFixed(1)}m
                          </div>
                          <div className="text-[10px] mt-1 text-slate-500">
                            {totalStepsX} × {totalStepsY} ステップ
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ゴミ箱（ドラッグ中のみ表示、Instagram風） */}
                  {draggedLineId && (
                    <div className="flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-200">
                      <div
                        ref={trashRef}
                        onDrop={handleTrashDrop}
                        onDragOver={handleTrashDragOver}
                        onDragEnter={handleTrashDragEnter}
                        onDragLeave={handleTrashDragLeave}
                        className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center text-2xl transition-all bg-red-600/30 border-red-500 text-red-400 scale-110"
                      >
                        🗑️
                      </div>
                    </div>
                  )}
                  
                  {/* 太線リスト */}
                  {boldLines.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-300">太線一覧</div>
                      <div className="space-y-1">
                        {boldLines.map((line) => (
                          <div
                            key={line.id}
                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-xs text-slate-300"
                          >
                            <span>
                              {line.type === "horizontal" ? "横線" : "縦線"} - 位置: {line.position}ステップ, 長さ: {line.length}ステップ
                            </span>
                            <button
                              onClick={() => updateBoldLines(boldLines.filter((l) => l.id !== line.id))}
                              className="text-red-400 hover:text-red-300"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* グリッド設定 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          グリッド設定
        </h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 space-y-6">
          {/* グリッド表示 */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) =>
                  updateSettings({ showGrid: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0 focus:ring-offset-slate-800"
              />
              <span className="text-sm font-medium text-slate-200">
                グリッドを表示
              </span>
            </label>
            <p className="text-xs text-slate-400">
              フィールド上にグリッド線を表示します
            </p>
          </div>

          {/* グリッド間隔 */}
          {settings.showGrid && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  グリッド間隔（ステップ）
                </label>
                <input
                  type="number"
                  value={localGridInterval}
                  onChange={(e) =>
                    setLocalGridInterval(Number(e.target.value))
                  }
                  min={1}
                  max={32}
                  step={1}
                  className="w-full max-w-[200px] px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
                />
                <p className="text-xs text-slate-400">
                  グリッド線を何ステップごとに表示するか設定します
                </p>
              </div>

              {/* よく使う間隔のクイック選択 */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  よく使う間隔
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 4, 8, 16, 32].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setLocalGridInterval(interval)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        localGridInterval === interval
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      {interval}ステップ
                    </button>
                  ))}
                </div>
              </div>

              {/* グリッド情報 */}
              <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>横方向のグリッド線:</span>
                    <span className="font-medium">
                      {Math.floor(totalStepsX / localGridInterval) + 1}本
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>縦方向のグリッド線:</span>
                    <span className="font-medium">
                      {Math.floor(totalStepsY / localGridInterval) + 1}本
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>グリッド間隔（メートル）:</span>
                    <span className="font-medium">
                      {(localGridInterval * STEP_M).toFixed(2)}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 保存・適用 */}
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/drill")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
            >
              ドリルエディタで確認
            </button>
            <Link
              href="/settings"
              className="px-4 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 text-sm rounded-lg transition-colors"
            >
              設定に戻る
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            設定は自動的に保存され、ドリルエディタに反映されます
          </p>
        </div>
      </section>
    </div>
  );
}

