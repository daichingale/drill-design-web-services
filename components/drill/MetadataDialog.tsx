// components/drill/MetadataDialog.tsx
"use client";

import { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  dataName: string;
  onSave: (title: string, dataName: string) => void;
};

export default function MetadataDialog({
  isOpen,
  onClose,
  title,
  dataName,
  onSave,
}: Props) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDataName, setLocalDataName] = useState(dataName);

  useEffect(() => {
    if (isOpen) {
      setLocalTitle(title);
      setLocalDataName(dataName);
    }
  }, [isOpen, title, dataName]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localTitle, localDataName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-sm shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-200 uppercase tracking-wider">
          ドリル情報
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              ドリルタイトル
            </label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
              placeholder="例: 2024年度定期演奏会"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              データ名
            </label>
            <input
              type="text"
              value={localDataName}
              onChange={(e) => setLocalDataName(e.target.value)}
              className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
              placeholder="例: 2024-regular-concert"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 hover:text-slate-100 transition-colors border border-slate-600/50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all duration-200 border border-emerald-500/50 shadow-md hover:shadow-lg"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

