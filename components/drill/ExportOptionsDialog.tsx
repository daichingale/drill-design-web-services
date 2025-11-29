// components/drill/ExportOptionsDialog.tsx
"use client";

import { useState } from "react";

export type ExportOptions = {
  includeSetName: boolean;
  includeCount: boolean;
  includeNote: boolean;
  includeInstructions: boolean;
  includeField: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  defaultOptions?: Partial<ExportOptions>;
};

export default function ExportOptionsDialog({
  isOpen,
  onClose,
  onConfirm,
  defaultOptions,
}: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    includeSetName: defaultOptions?.includeSetName ?? true,
    includeCount: defaultOptions?.includeCount ?? true,
    includeNote: defaultOptions?.includeNote ?? true,
    includeInstructions: defaultOptions?.includeInstructions ?? true,
    includeField: defaultOptions?.includeField ?? true,
  });

  if (!isOpen) return null;

  const handleToggle = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
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

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors text-sm font-semibold"
          >
            実行
          </button>
        </div>
      </div>
    </div>
  );
}

