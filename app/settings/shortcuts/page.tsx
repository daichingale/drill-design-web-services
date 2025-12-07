// app/settings/shortcuts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useShortcuts } from "@/context/ShortcutContext";
import { formatShortcutKey } from "@/hooks/useKeyboardShortcuts";
import type { ShortcutKey } from "@/hooks/useKeyboardShortcuts";
import Link from "next/link";
import BackToDrillButton from "@/components/BackToDrillButton";

type ShortcutDefinition = {
  id: string;
  name: string;
  category: string;
  defaultKeys: ShortcutKey;
};

const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: "copy", name: "コピー", category: "編集", defaultKeys: { key: "c", ctrl: true } },
  { id: "paste", name: "貼り付け", category: "編集", defaultKeys: { key: "v", ctrl: true } },
  { id: "delete", name: "削除", category: "編集", defaultKeys: { key: "Delete" } },
  { id: "backspace", name: "削除（Backspace）", category: "編集", defaultKeys: { key: "Backspace" } },
  { id: "deselectAll", name: "全選択解除", category: "選択", defaultKeys: { key: "d", ctrl: true } },
  { id: "setPrevious", name: "前のセットに切り替え", category: "セット操作", defaultKeys: { key: "ArrowLeft", ctrl: true } },
  { id: "setNext", name: "次のセットに切り替え", category: "セット操作", defaultKeys: { key: "ArrowRight", ctrl: true } },
  { id: "zoomIn", name: "ズームイン", category: "表示", defaultKeys: { key: "=", ctrl: true } },
  { id: "zoomOut", name: "ズームアウト", category: "表示", defaultKeys: { key: "-", ctrl: true } },
  { id: "toggleGrid", name: "グリッド表示の切り替え", category: "表示", defaultKeys: { key: "g", ctrl: true } },
  { id: "shortcutHelp", name: "ショートカットヘルプ", category: "ヘルプ", defaultKeys: { key: "?", shift: true } },
];

export default function ShortcutsSettingsPage() {
  const { customShortcuts, setShortcut, resetShortcut, resetAllShortcuts, getShortcut, checkConflict } = useShortcuts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capturingKeys, setCapturingKeys] = useState<ShortcutKey | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);

  const handleStartEdit = (id: string) => {
    setEditingId(id);
    setCapturingKeys(null);
    setConflictId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCapturingKeys(null);
    setConflictId(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!editingId) return;

    e.preventDefault();
    e.stopPropagation();

    const keys: ShortcutKey = {
      key: e.key === "Meta" || e.key === "Control" ? "" : e.key,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    // Meta/Controlキーだけの場合は無視
    if (!keys.key) return;

    setCapturingKeys(keys);

    // 競合チェック
    const conflict = checkConflict(keys, editingId);
    setConflictId(conflict);
  };

  useEffect(() => {
    if (!editingId) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingId, checkConflict]);

  const handleSave = (id: string) => {
    if (!capturingKeys || !capturingKeys.key) {
      alert("有効なキーを入力してください");
      return;
    }

    if (conflictId) {
      if (!confirm(`このショートカットは「${SHORTCUT_DEFINITIONS.find((s) => s.id === conflictId)?.name}」と競合しています。上書きしますか？`)) {
        return;
      }
    }

    setShortcut(id, capturingKeys);
    setEditingId(null);
    setCapturingKeys(null);
    setConflictId(null);
  };

  const groupedShortcuts = SHORTCUT_DEFINITIONS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutDefinition[]>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              キーボードショートカット設定
            </h1>
            <div className="flex items-center gap-3">
              <BackToDrillButton />
              <Link
                href="/settings"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-medium transition-all duration-200"
              >
                設定に戻る
              </Link>
            </div>
          </div>
          <p className="text-slate-400">キーボードショートカットをカスタマイズできます。</p>
        </div>

        {/* リセットボタン */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => {
              if (confirm("すべてのショートカットをデフォルトに戻しますか？")) {
                resetAllShortcuts();
              }
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-medium transition-all duration-200"
          >
            すべてリセット
          </button>
        </div>

        {/* ショートカット一覧 */}
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">{category}</h2>
              <div className="space-y-3">
                {shortcuts.map((shortcut) => {
                  const currentKeys = getShortcut(shortcut.id);
                  const isEditing = editingId === shortcut.id;
                  const isCustom = !!customShortcuts[shortcut.id];

                  return (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between px-4 py-3 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">{shortcut.name}</span>
                          {isCustom && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs">
                              カスタム
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <kbd className="px-3 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-mono text-slate-300 min-w-[120px] text-center">
                                {capturingKeys ? formatShortcutKey(capturingKeys) : "キーを押してください..."}
                              </kbd>
                              {conflictId && (
                                <span className="text-xs text-red-400">
                                  競合: {SHORTCUT_DEFINITIONS.find((s) => s.id === conflictId)?.name}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleSave(shortcut.id)}
                              disabled={!capturingKeys || !capturingKeys.key || !!conflictId}
                              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm transition-colors"
                            >
                              保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <kbd className="px-3 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-mono text-slate-300">
                              {formatShortcutKey(currentKeys)}
                            </kbd>
                            <button
                              onClick={() => handleStartEdit(shortcut.id)}
                              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                            >
                              編集
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => {
                                  if (confirm("このショートカットをデフォルトに戻しますか？")) {
                                    resetShortcut(shortcut.id);
                                  }
                                }}
                                className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                              >
                                リセット
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


