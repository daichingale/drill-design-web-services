// components/ShortcutHelpDialog.tsx
"use client";

import { useState, useEffect } from "react";
import type { ShortcutDefinition } from "@/hooks/useKeyboardShortcuts";
import { formatShortcutKey } from "@/hooks/useKeyboardShortcuts";

type ShortcutHelpDialogProps = {
  shortcuts: ShortcutDefinition[];
  open: boolean;
  onClose: () => void;
};

export default function ShortcutHelpDialog({
  shortcuts,
  open,
  onClose,
}: ShortcutHelpDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Escapeキーで閉じる
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  // カテゴリごとにグループ化
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || "その他";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutDefinition[]>
  );

  // 検索フィルタ
  const filteredShortcuts = searchQuery
    ? shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatShortcutKey(s.keys).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shortcuts;

  const filteredGrouped = searchQuery
    ? { 検索結果: filteredShortcuts }
    : groupedShortcuts;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-200">キーボードショートカット</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="ショートカットを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            autoFocus
          />
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.entries(filteredGrouped).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between px-4 py-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="text-sm text-slate-200">{shortcut.description}</span>
                    <kbd className="px-3 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-mono text-slate-300">
                      {formatShortcutKey(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-slate-700/80 shrink-0 text-center">
          <p className="text-xs text-slate-400">
            Escapeキーで閉じる
          </p>
        </div>
      </div>
    </div>
  );
}


