// components/drill/DrillControls.tsx
"use client";

type SetInfo = {
  id: string;
  name: string;
};

type Props = {
  sets: SetInfo[];
  currentSetId: string;
  onChangeCurrentSet: (id: string) => void;
  onAddSet: () => void;

  playStartId: string;
  playEndId: string;
  onChangePlayStart: (id: string) => void;
  onChangePlayEnd: (id: string) => void;

  onStartPlay: () => void;
  onStopPlay: () => void;

  onArrangeLineSelected: () => void;   // ★ 追加：ライン整列
  onStartBezierArc: () => void;
  onClearBezierArc: () => void;
  isPlaying: boolean;
  bezierActive: boolean;
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
}: Props) {
  return (
    <div className="mb-4 space-y-2">
      {/* セットボタン */}
      <div className="flex gap-2">
        {sets.map((set) => (
          <button
            key={set.id}
            className={`px-3 py-1 rounded border text-sm ${
              set.id === currentSetId ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => onChangeCurrentSet(set.id)}
          >
            {set.name}
          </button>
        ))}

        <button
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          onClick={onAddSet}
        >
          ＋ セット追加
        </button>
      </div>

      {/* 再生範囲指定 */}
      <div className="flex items-center gap-2 text-sm">
        <span>再生範囲：</span>
        <select
          value={playStartId}
          onChange={(e) => onChangePlayStart(e.target.value)}
          className="border rounded px-1 py-0.5"
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span>→</span>
        <select
          value={playEndId}
          onChange={(e) => onChangePlayEnd(e.target.value)}
          className="border rounded px-1 py-0.5"
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 再生ボタン */}
      <div className="flex gap-2">
        <button
          onClick={onStartPlay}
          className="px-4 py-1 rounded bg-green-600 text-white text-sm"
        >
          ▶ 連続再生
        </button>
        <button
          onClick={onStopPlay}
          className="px-4 py-1 rounded bg-gray-600 text-white text-sm"
        >
          ■ 停止
        </button>
      </div>

      {/* 整列ツール */}
      <div className="flex gap-2 items-center text-sm">
        <button
          onClick={onArrangeLineSelected}
          disabled={isPlaying}
          className="px-3 py-1 rounded border bg-white disabled:opacity-50"
        >
          横ライン整列（選択）
        </button>

        <button
          onClick={onStartBezierArc}
          disabled={isPlaying}
          className="px-3 py-1 rounded border bg-white disabled:opacity-50"
        >
          ベジェアーク整列（選択）
        </button>
        <button
          onClick={onClearBezierArc}
          disabled={!bezierActive}
          className="px-3 py-1 rounded border bg-white disabled:opacity-50"
        >
          アークモード解除
        </button>
        {bezierActive && (
          <span className="text-xs text-gray-500">
            ※3点と中央ハンドルで形＆位置を調整
          </span>
        )}
      </div>
    </div>
  );
}
