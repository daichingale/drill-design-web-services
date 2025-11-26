// components/drill/DrillControls.tsx
"use client";

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

  playStartId: string;
  playEndId: string;
  onChangePlayStart: (id: string) => void;
  onChangePlayEnd: (id: string) => void;

  onStartPlay: () => void;
  onStopPlay: () => void;

  onArrangeLineSelected: () => void;
  onStartBezierArc: () => void;
  onClearBezierArc: () => void;
  isPlaying: boolean;
  bezierActive: boolean;

  onChangeSetStartCount: (id: string, value: number) => void;
};

export default function DrillControls({
  sets,
  currentSetId,
  onChangeCurrentSet,
  onAddSet,
  playStartId,
  playEndId,
  onChangePlayStart,
  onChangePlayEnd,
  onStartPlay,
  onStopPlay,
  onArrangeLineSelected,
  onStartBezierArc,
  onClearBezierArc,
  isPlaying,
  bezierActive,
  onChangeSetStartCount,
}: Props) {
  const currentSet = sets.find((s) => s.id === currentSetId) ?? sets[0];

  return (
    <div className="space-y-3">
      {/* 再生系 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={isPlaying ? onStopPlay : onStartPlay}
          className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400"
        >
          {isPlaying ? "■ 停止" : "▶ 再生"}
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-300">再生範囲:</span>
          <select
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            value={playStartId}
            onChange={(e) => onChangePlayStart(e.target.value)}
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span>〜</span>
          <select
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            value={playEndId}
            onChange={(e) => onChangePlayEnd(e.target.value)}
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onAddSet}
          className="ml-auto inline-flex items-center rounded-md border border-slate-500 bg-slate-800 px-3 py-1 text-sm text-slate-100 hover:bg-slate-700"
        >
          ＋ Set 追加（最後尾）
        </button>
      </div>

      {/* Set インスペクタ（1 件だけ編集） */}
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
                  onChangeSetStartCount(
                    currentSet.id,
                    Number(e.target.value)
                  )
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
