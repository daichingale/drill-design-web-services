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
  onArrangeLineBySelectionOrder?: () => void;
  onReorderSelection?: (direction: 'up' | 'down') => void;
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
  confirmedCounts?: number[]; // 確定済みカウントのリスト
  currentCount?: number; // 現在のカウント
  onJumpToCount?: (count: number) => void; // カウントにジャンプする関数
};

export default function DrillControls({
  sets,
  currentSetId,
  onChangeCurrentSet,
  onAddSet,
  onDeleteSet,
  onReorderSet,
  onArrangeLineSelected,
  onArrangeLineBySelectionOrder,
  onReorderSelection,
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
  confirmedCounts = [],
  currentCount,
  onJumpToCount,
}: Props) {
  const currentSet = sets.find((s) => s.id === currentSetId) ?? sets[0];
  
  // 確定済みカウントのナビゲーション
  const currentConfirmedIndex = confirmedCounts.findIndex(c => c === currentCount);
  const hasPrevConfirmed = currentConfirmedIndex > 0;
  const hasNextConfirmed = currentConfirmedIndex >= 0 && currentConfirmedIndex < confirmedCounts.length - 1;
  
  const jumpToPrevConfirmed = () => {
    if (hasPrevConfirmed && onJumpToCount) {
      onJumpToCount(confirmedCounts[currentConfirmedIndex - 1]);
    }
  };
  
  const jumpToNextConfirmed = () => {
    if (hasNextConfirmed && onJumpToCount) {
      onJumpToCount(confirmedCounts[currentConfirmedIndex + 1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Set 操作（追加など） */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400/90 uppercase tracking-wider whitespace-nowrap">Set 操作</span>
        <button
          type="button"
          onClick={onAddSet}
          className="inline-flex items-center rounded-md bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-500/50 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
        >
          ＋ Set 追加（最後尾）
        </button>
      </div>

      {/* スナップ設定 */}
      <SnapModeToggle value={snapMode} onChange={onChangeSnapMode} />

      {/* Set インスペクタ */}
      {currentSet && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/80 p-4 shadow-lg backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400/90 uppercase tracking-wider">現在の Set</span>
              <select
                className="flex-1 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                value={currentSetId}
                onChange={(e) => onChangeCurrentSet(e.target.value)}
              >
                {sets.map((s, index) => (
                  <option key={`${s.id}-${index}`} value={s.id} className="bg-slate-800">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400/90 uppercase tracking-wider">
                開始カウント
              </label>
              <input
                type="number"
                className="w-24 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-1.5 text-right text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                value={currentSet.startCount}
                onChange={(e) =>
                  onChangeSetStartCount(currentSet.id, Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* 確定済みカウントナビゲーション */}
          {confirmedCounts.length > 0 && onJumpToCount && (
            <div className="mt-3 pt-3 border-t border-slate-700/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400/90 uppercase tracking-wider">確定済みカウント</span>
                  <select
                    className="flex-1 rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-500/60 px-3 py-1.5 text-sm text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                    value={currentCount !== undefined && confirmedCounts.includes(Math.round(currentCount)) ? Math.round(currentCount) : ""}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      if (!isNaN(count)) {
                        onJumpToCount(count);
                      }
                    }}
                  >
                    <option value="" className="bg-slate-800">選択してください</option>
                    {confirmedCounts.map((count) => (
                      <option key={count} value={count} className="bg-slate-800">
                        Count {count}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={jumpToPrevConfirmed}
                    disabled={!hasPrevConfirmed}
                    className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-emerald-200 hover:text-emerald-100 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm"
                    title="前の確定カウントへ"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={jumpToNextConfirmed}
                    disabled={!hasNextConfirmed}
                    className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-emerald-200 hover:text-emerald-100 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm"
                    title="次の確定カウントへ"
                  >
                    ↓
                  </button>
                  {currentCount !== undefined && confirmedCounts.includes(Math.round(currentCount)) && (
                    <span className="ml-auto text-xs text-emerald-300 font-mono">
                      Count {Math.round(currentCount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* セット操作ボタン */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
            {onReorderSet && (
              <>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'up')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === 0}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-slate-200 hover:text-slate-100 border border-slate-600/40 hover:border-slate-500/60 shadow-sm"
                  title="上に移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'down')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === sets.length - 1}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-slate-200 hover:text-slate-100 border border-slate-600/40 hover:border-slate-500/60 shadow-sm"
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
                className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-white border border-red-500/50 shadow-md hover:shadow-lg"
                title="セットを削除"
              >
                削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 整列・ベジェ操作 */}
      <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">整列・ベジェ操作</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onArrangeLineSelected}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
          >
            一列整列（ID順）
          </button>
          {onArrangeLineBySelectionOrder && (
            <button
              type="button"
              onClick={onArrangeLineBySelectionOrder}
              className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
            >
              一列整列（選択順）
            </button>
          )}
          {onReorderSelection && (
            <>
              <button
                type="button"
                onClick={() => onReorderSelection('up')}
                className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-2.5 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
                title="選択順を上に移動"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onReorderSelection('down')}
                className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-2.5 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
                title="選択順を下に移動"
              >
                ↓
              </button>
            </>
          )}

          <button
            type="button"
            onClick={bezierActive ? onClearBezierArc : onStartBezierArc}
            className={`rounded-md border px-3 py-1.5 text-sm transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap ${
              bezierActive
                ? "bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500/60 text-white"
                : "bg-slate-700/40 hover:bg-slate-700/60 border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100"
            }`}
          >
            {bezierActive ? "ベジェアーク解除" : "ベジェアーク整列"}
          </button>
        </div>
      </div>

      {/* 形状作成 */}
      <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">形状作成</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const radius = parseFloat(prompt("半径（メートル）を入力してください", "5") || "5");
              if (!isNaN(radius)) {
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onArrangeCircle({ x: 0, y: 0 }, radius);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
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
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
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
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
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
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            📦 ボックス
          </button>
        </div>
      </div>

      {/* 変形・回転 */}
      <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">変形・回転</h3>
        <div className="flex flex-wrap gap-2">
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
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
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
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
          >
            🔍 拡大/縮小
          </button>
        </div>
      </div>

      {/* 個別配置 */}
      <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">個別配置</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleIndividualPlacement}
            className={`rounded-md border px-3 py-1.5 text-sm transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap ${
              individualPlacementMode
                ? "bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 hover:from-emerald-600 hover:to-emerald-700 border-emerald-500/60 text-white"
                : "bg-slate-700/40 hover:bg-slate-700/60 border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100"
            }`}
          >
            {individualPlacementMode ? "📍 個別配置モード（ON）" : "📍 個別配置モード"}
          </button>
        </div>
        {individualPlacementMode && (
          <p className="text-[10px] text-slate-400/80 mt-2 px-2 py-1 rounded-md bg-slate-800/30 border border-slate-700/30">
            フィールドをクリックすると、選択されたメンバーを順番に配置します。
          </p>
        )}
      </div>
    </div>
  );
}
