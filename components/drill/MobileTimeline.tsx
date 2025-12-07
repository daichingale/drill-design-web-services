// components/drill/MobileTimeline.tsx
"use client";

import { useState } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";

type Props = {
  sets: UiSet[];
  currentSetId: string;
  currentCount: number;
  isPlaying: boolean;
  onToggleSet: (setId: string) => void;
  onAddSetAtCurrent: () => void;
  onDeleteSet: (id: string) => void;
  onStartPlay: (startCount?: number, endCount?: number, loop?: boolean) => void;
  onStopPlay: () => void;
  onScrub: (count: number) => void;
};

export default function MobileTimeline({
  sets,
  currentSetId,
  currentCount,
  isPlaying,
  onToggleSet,
  onAddSetAtCurrent,
  onDeleteSet,
  onStartPlay,
  onStopPlay,
  onScrub,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [setToDelete, setSetToDelete] = useState<string | null>(null);
  const [isCountInputOpen, setIsCountInputOpen] = useState(false);
  const [countInputValue, setCountInputValue] = useState("");
  const [loopEnabled, setLoopEnabled] = useState(false);

  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const currentSet = sets.find((s) => s.id === currentSetId);
  const currentSetIndex = sortedSets.findIndex((s) => s.id === currentSetId);
  const prevSet = currentSetIndex > 0 ? sortedSets[currentSetIndex - 1] : null;
  const nextSet = currentSetIndex < sortedSets.length - 1 ? sortedSets[currentSetIndex + 1] : null;

  // セットの終了カウントを計算
  const getSetEndCount = (set: UiSet): number => {
    let endCount = Math.round(set.startCount);
    if (set.positionsByCount) {
      const counts = Object.keys(set.positionsByCount).map(Number);
      if (counts.length > 0) {
        endCount = Math.max(endCount, ...counts);
      }
    }
    // 次のセットがある場合は、そのstartCount - 1まで
    const nextSetForThis = sortedSets.find((s) => s.startCount > set.startCount);
    if (nextSetForThis) {
      endCount = Math.max(endCount, Math.round(nextSetForThis.startCount) - 1);
    }
    return endCount;
  };

  const handleDelete = (setId: string) => {
    if (sets.length <= 1) {
      alert("最後のセットは削除できません。");
      return;
    }
    setSetToDelete(setId);
  };

  const confirmDelete = () => {
    if (setToDelete) {
      onDeleteSet(setToDelete);
      setSetToDelete(null);
    }
  };

  const cancelDelete = () => {
    setSetToDelete(null);
  };

  const handleCountInputSubmit = () => {
    const count = parseFloat(countInputValue);
    if (!isNaN(count) && count >= 0) {
      onScrub(count);
      setIsCountInputOpen(false);
      setCountInputValue("");
    }
  };

  const handlePrevSet = () => {
    if (prevSet) {
      onToggleSet(prevSet.id);
    }
  };

  const handleNextSet = () => {
    if (nextSet) {
      onToggleSet(nextSet.id);
    }
  };

  const handleStepPrev = () => {
    onScrub(Math.max(0, currentCount - 1));
  };

  const handleStepNext = () => {
    onScrub(currentCount + 1);
  };

  // 現在のセットの範囲で再生を開始
  const handleStartPlayWithCurrentSet = () => {
    if (currentSet) {
      const startCount = Math.round(currentSet.startCount);
      const endCount = getSetEndCount(currentSet);
      onStartPlay(startCount, endCount, loopEnabled);
    } else {
      onStartPlay();
    }
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700">
      {/* コンパクト表示（常に表示） */}
      <div className="p-2">
        {/* セット切り替えとカウント入力 */}
        <div className="flex items-center gap-1.5 mb-2">
          {/* 前のセットボタン */}
          <button
            onClick={handlePrevSet}
            disabled={!prevSet}
            className={`px-2 py-1.5 rounded text-xs transition-all active:scale-95 ${
              prevSet
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* セット選択ドロップダウン */}
          <select
            value={currentSetId}
            onChange={(e) => onToggleSet(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded bg-slate-700 text-white text-xs font-semibold border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {sortedSets.map((set, index) => (
              <option key={set.id} value={set.id}>
                {set.name || `Set ${index + 1}`} (Count {Math.round(set.startCount)})
              </option>
            ))}
          </select>

          {/* 次のセットボタン */}
          <button
            onClick={handleNextSet}
            disabled={!nextSet}
            className={`px-2 py-1.5 rounded text-xs transition-all active:scale-95 ${
              nextSet
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* カウント移動コントロール */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <button
            onClick={handleStepPrev}
            className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
            title="1カウント戻る"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 rounded border border-slate-600">
            <button
              onClick={() => setIsCountInputOpen(!isCountInputOpen)}
              className="text-xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors active:scale-95"
            >
              {Math.round(currentCount)}
            </button>
            <span className="text-xs text-slate-400">Count</span>
          </div>

          <button
            onClick={handleStepNext}
            className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
            title="1カウント進む"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 再生範囲とループ設定（コンパクト） */}
        {currentSet && (
          <div className="mb-2 px-2 py-1.5 bg-slate-700/30 rounded border border-slate-600/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-300">
                  Count {Math.round(currentSet.startCount)} ～ {getSetEndCount(currentSet)}
                </div>
              </div>
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  loopEnabled
                    ? "bg-emerald-600/50 text-emerald-300 border border-emerald-500/50"
                    : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                }`}
                title={loopEnabled ? "ループ: ON" : "ループ: OFF"}
              >
                🔁
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* 再生/停止ボタン */}
          <button
            onClick={isPlaying ? onStopPlay : handleStartPlayWithCurrentSet}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all active:scale-95 ${
              isPlaying
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isPlaying ? (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>停止</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>再生</span>
              </div>
            )}
          </button>

          {/* 展開/折りたたみボタン */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors active:scale-95"
            aria-label={isExpanded ? "折りたたむ" : "展開"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* カウント入力フィールド */}
        {isCountInputOpen && (
          <div className="mt-2 p-2 bg-slate-700/50 rounded border border-slate-600">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={countInputValue}
                onChange={(e) => setCountInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCountInputSubmit();
                  } else if (e.key === "Escape") {
                    setIsCountInputOpen(false);
                    setCountInputValue("");
                  }
                }}
                placeholder={`現在: ${Math.round(currentCount)}`}
                className="flex-1 px-2 py-1.5 rounded bg-slate-800 text-white text-sm border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
              <button
                onClick={handleCountInputSubmit}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors active:scale-95"
              >
                移動
              </button>
              <button
                onClick={() => {
                  setIsCountInputOpen(false);
                  setCountInputValue("");
                }}
                className="px-3 py-1.5 rounded bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold transition-colors active:scale-95"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 展開表示（セット一覧） */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {/* セット追加ボタン */}
          <button
            onClick={() => {
              onAddSetAtCurrent();
              setIsExpanded(false);
            }}
            className="w-full px-4 py-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-base transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>現在のカウントにセットを追加</span>
          </button>

          {/* セット一覧 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 px-2">セット一覧</h3>
            {sortedSets.map((set) => {
              const isCurrent = set.id === currentSetId;
              return (
                <div
                  key={set.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? "bg-emerald-900/30 border-emerald-500 shadow-lg"
                      : "bg-slate-700/50 border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-200">
                          {set.name || `Set ${Math.round(set.startCount)}`}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-semibold">
                            現在
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        Count {Math.round(set.startCount)} ～ {getSetEndCount(set)}
                      </div>
                      {set.note && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{set.note}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onToggleSet(set.id);
                          setIsExpanded(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors active:scale-95 ${
                          isCurrent
                            ? "bg-slate-600 text-slate-300"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {isCurrent ? "選択中" : "選択"}
                      </button>
                      <button
                        onClick={() => handleDelete(set.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors active:scale-95"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {setToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">セットを削除しますか？</h3>
            <p className="text-sm text-slate-400 mb-6">
              この操作は取り消せません。セット内のすべての位置情報が失われます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors active:scale-95"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors active:scale-95"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

