// components/drill/ExportOptionsDialog.tsx
"use client";

import { useState, useEffect } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";

export type ExportOptions = {
  includeSetName: boolean;
  includeCount: boolean;
  includeNote: boolean;
  includeInstructions: boolean;
  includeField: boolean;
  selectedSetIds?: string[]; // 選択されたSetのIDリスト
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  defaultOptions?: Partial<ExportOptions>;
  sets?: UiSet[]; // Setリスト
  allowSetSelection?: boolean; // Set選択を許可するか（PDF/印刷の場合）
};

export default function ExportOptionsDialog({
  isOpen,
  onClose,
  onConfirm,
  defaultOptions,
  sets = [],
  allowSetSelection = false,
}: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    includeSetName: defaultOptions?.includeSetName ?? true,
    includeCount: defaultOptions?.includeCount ?? true,
    includeNote: defaultOptions?.includeNote ?? true,
    includeInstructions: defaultOptions?.includeInstructions ?? true,
    includeField: defaultOptions?.includeField ?? true,
    selectedSetIds: defaultOptions?.selectedSetIds ?? (sets.length > 0 ? sets.map(s => s.id) : []),
  });

  // ダイアログが開かれたときに選択状態をリセット
  useEffect(() => {
    if (isOpen && allowSetSelection && sets.length > 0) {
      setOptions(prev => ({
        ...prev,
        selectedSetIds: sets.map(s => s.id), // デフォルトで全選択
      }));
    }
  }, [isOpen, allowSetSelection, sets]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleSet = (setId: string) => {
    setOptions((prev) => {
      const currentIds = prev.selectedSetIds || [];
      const newIds = currentIds.includes(setId)
        ? currentIds.filter(id => id !== setId)
        : [...currentIds, setId];
      return { ...prev, selectedSetIds: newIds };
    });
  };

  const handleSelectAllSets = () => {
    setOptions((prev) => ({
      ...prev,
      selectedSetIds: sets.map(s => s.id),
    }));
  };

  const handleDeselectAllSets = () => {
    setOptions((prev) => ({
      ...prev,
      selectedSetIds: [],
    }));
  };

  const handleConfirm = () => {
    onConfirm(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">
          エクスポート・印刷オプション
        </h2>
        <p className="text-sm text-slate-400">
          出力に含める項目を選択してください
        </p>

        <div className="space-y-4">
          {/* Set選択（PDF/印刷の場合のみ） */}
          {allowSetSelection && sets.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-200">印刷するSetを選択</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSets}
                    className="px-2 py-1 text-xs rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 transition-colors"
                  >
                    全て選択
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllSets}
                    className="px-2 py-1 text-xs rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 transition-colors"
                  >
                    全て解除
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 sidebar-scrollbar">
                {sets.map((set) => {
                  const isSelected = options.selectedSetIds?.includes(set.id) ?? false;
                  return (
                    <label
                      key={set.id}
                      className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-slate-700/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSet(set.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-200 flex-1">
                        {set.name} (Count {Math.round(set.startCount)})
                      </span>
                    </label>
                  );
                })}
              </div>
              {(!options.selectedSetIds || options.selectedSetIds.length === 0) && (
                <p className="text-xs text-red-400 mt-2">
                  ⚠️ 少なくとも1つのSetを選択してください
                </p>
              )}
            </div>
          )}

          {/* 出力オプション */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeSetName}
                onChange={() => handleToggle("includeSetName")}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-200">セット名</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCount}
                onChange={() => handleToggle("includeCount")}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-200">開始カウント</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeNote}
                onChange={() => handleToggle("includeNote")}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-200">ノート</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeInstructions}
                onChange={() => handleToggle("includeInstructions")}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-200">動き方・指示</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeField}
                onChange={() => handleToggle("includeField")}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-200">フィールド画像</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={allowSetSelection && (!options.selectedSetIds || options.selectedSetIds.length === 0)}
            className="px-4 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 transition-colors text-sm font-semibold shadow-lg shadow-emerald-600/20"
          >
            実行
          </button>
        </div>
      </div>
    </div>
  );
}

