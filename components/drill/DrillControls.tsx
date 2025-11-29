// components/drill/DrillControls.tsx
"use client";

import { SnapModeToggle, type SnapMode } from "@/components/ui/snap-mode-toggle";

type SetSummary = {
  id: string;
  name: string;
  startCount: number;
};

type Props = {
  sets: SetSummary[];
  currentSetId: string;
  onChangeCurrentSet: (id: string) => void;
  onAddSet: () => void;
  onDeleteSet?: (id: string) => void;
  onReorderSet?: (id: string, direction: 'up' | 'down') => void;

  onArrangeLineSelected: () => void;
  onStartBezierArc: () => void;
  onClearBezierArc: () => void;
  bezierActive: boolean;

  // 形状作成
  onArrangeCircle: (center: { x: number; y: number }, radius: number) => void;
  onArrangeRectangle: (center: { x: number; y: number }, width: number, height: number) => void;
  onArrangeSpiral: (center: { x: number; y: number }, maxRadius: number, turns?: number) => void;
  onArrangeBox: (center: { x: number; y: number }, width: number, height: number, spacing?: number) => void;
  
  // 変形・回転
  onRotateSelected: (center: { x: number; y: number }, angle: number) => void;
  onScaleSelected: (center: { x: number; y: number }, scaleX: number, scaleY?: number) => void;

  // 個別配置
  individualPlacementMode: boolean;
  onToggleIndividualPlacement: () => void;

  onChangeSetStartCount: (id: string, value: number) => void;
  snapMode: SnapMode;
  onChangeSnapMode: (mode: SnapMode) => void;
};

export default function DrillControls({
  sets,
  currentSetId,
  onChangeCurrentSet,
  onAddSet,
  onDeleteSet,
  onReorderSet,
  onArrangeLineSelected,
  onStartBezierArc,
  onClearBezierArc,
  bezierActive,
  onArrangeCircle,
  onArrangeRectangle,
  onArrangeSpiral,
  onArrangeBox,
  onRotateSelected,
  onScaleSelected,
  individualPlacementMode,
  onToggleIndividualPlacement,
  onChangeSetStartCount,
  snapMode,
  onChangeSnapMode,
}: Props) {
  const currentSet = sets.find((s) => s.id === currentSetId) ?? sets[0];

  return (
    <div className="space-y-3">
      {/* Set 操作（追加など） */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Set 操作</span>
        <button
          type="button"
          onClick={onAddSet}
          className="inline-flex items-center rounded-md border border-slate-500 bg-slate-800 px-3 py-1 text-sm text-slate-100 hover:bg-slate-700"
        >
          ＋ Set 追加（最後尾）
        </button>
      </div>

      {/* スナップ設定 */}
      <SnapModeToggle value={snapMode} onChange={onChangeSnapMode} />

      {/* Set インスペクタ */}
      {currentSet && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">現在の Set:</span>
            <select
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
              value={currentSetId}
              onChange={(e) => onChangeCurrentSet(e.target.value)}
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-300">
              開始カウント:
              <input
                type="number"
                className="ml-1 w-20 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-right text-sm"
                value={currentSet.startCount}
                onChange={(e) =>
                  onChangeSetStartCount(currentSet.id, Number(e.target.value))
                }
              />
            </label>
          </div>

          {/* セット操作ボタン */}
          <div className="flex items-center gap-1">
            {onReorderSet && (
              <>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'up')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === 0}
                  className="px-2 py-1 text-xs rounded-md border border-slate-600 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="上に移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'down')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === sets.length - 1}
                  className="px-2 py-1 text-xs rounded-md border border-slate-600 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="下に移動"
                >
                  ↓
                </button>
              </>
            )}
            {onDeleteSet && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`「${currentSet.name}」を削除しますか？`)) {
                    onDeleteSet(currentSetId);
                  }
                }}
                disabled={sets.length <= 1}
                className="px-2 py-1 text-xs rounded-md border border-red-600 bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-red-300"
                title="セットを削除"
              >
                削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 整列・ベジェ操作 */}
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={onArrangeLineSelected}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
        >
          一列整列（選択）
        </button>

        <button
          type="button"
          onClick={bezierActive ? onClearBezierArc : onStartBezierArc}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
        >
          {bezierActive ? "ベジェアーク解除" : "ベジェアーク整列"}
        </button>
      </div>

      {/* 形状作成 */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400">形状作成</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              const radius = parseFloat(prompt("半径（メートル）を入力してください", "5") || "5");
              if (!isNaN(radius)) {
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onArrangeCircle({ x: 0, y: 0 }, radius);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            ⭕ 円
          </button>

          <button
            type="button"
            onClick={() => {
              const width = parseFloat(prompt("幅（メートル）を入力してください", "10") || "10");
              const height = parseFloat(prompt("高さ（メートル）を入力してください", "10") || "10");
              if (!isNaN(width) && !isNaN(height)) {
                onArrangeRectangle({ x: 0, y: 0 }, width, height);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            ⬜ 四角
          </button>

          <button
            type="button"
            onClick={() => {
              const maxRadius = parseFloat(prompt("最大半径（メートル）を入力してください", "8") || "8");
              const turns = parseFloat(prompt("回転数（デフォルト2）", "2") || "2");
              if (!isNaN(maxRadius)) {
                onArrangeSpiral({ x: 0, y: 0 }, maxRadius, isNaN(turns) ? 2 : turns);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            🌀 うずまき
          </button>

          <button
            type="button"
            onClick={() => {
              const width = parseFloat(prompt("幅（メートル）を入力してください", "8") || "8");
              const height = parseFloat(prompt("高さ（メートル）を入力してください", "8") || "8");
              const spacing = parseFloat(prompt("間隔（メートル、デフォルト1.5）", "1.5") || "1.5");
              if (!isNaN(width) && !isNaN(height)) {
                onArrangeBox({ x: 0, y: 0 }, width, height, isNaN(spacing) ? 1.5 : spacing);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            📦 ボックス
          </button>
        </div>
      </div>

      {/* 変形・回転 */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400">変形・回転</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              const angleDeg = parseFloat(prompt("回転角度（度）を入力してください", "90") || "90");
              if (!isNaN(angleDeg)) {
                const angleRad = (angleDeg * Math.PI) / 180;
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onRotateSelected({ x: 0, y: 0 }, angleRad);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            🔄 回転
          </button>

          <button
            type="button"
            onClick={() => {
              const scale = parseFloat(prompt("スケール（倍率）を入力してください", "1.2") || "1.2");
              if (!isNaN(scale)) {
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onScaleSelected({ x: 0, y: 0 }, scale);
              }
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            🔍 拡大/縮小
          </button>
        </div>
      </div>

      {/* 個別配置 */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400">個別配置</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={onToggleIndividualPlacement}
            className={`rounded-md border px-3 py-1 ${
              individualPlacementMode
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "border-slate-600 bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {individualPlacementMode ? "📍 個別配置モード（ON）" : "📍 個別配置モード"}
          </button>
        </div>
        {individualPlacementMode && (
          <p className="text-[10px] text-slate-500">
            フィールドをクリックすると、選択されたメンバーを順番に配置します。
          </p>
        )}
      </div>
    </div>
  );
}
