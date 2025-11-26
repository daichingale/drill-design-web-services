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

  onArrangeLineSelected: () => void;
  onStartBezierArc: () => void;
  onClearBezierArc: () => void;
  bezierActive: boolean;

  onChangeSetStartCount: (id: string, value: number) => void;
  snapMode: SnapMode;
  onChangeSnapMode: (mode: SnapMode) => void;
};

export default function DrillControls({
  sets,
  currentSetId,
  onChangeCurrentSet,
  onAddSet,
  onArrangeLineSelected,
  onStartBezierArc,
  onClearBezierArc,
  bezierActive,
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
    </div>
  );
}
