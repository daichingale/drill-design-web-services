// components/drill/CommandPalette.tsx
"use client";

import { useState, useEffect, useRef } from "react";

export type Command = {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  group: "file" | "edit" | "export" | "import" | "view";
  action: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
};

export default function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // フィルタリングされたコマンド
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // グループごとに整理
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.group]) acc[cmd.group] = [];
      acc[cmd.group].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  const groupLabels: Record<string, string> = {
    file: "ファイル",
    edit: "編集",
    export: "エクスポート",
    import: "インポート",
    view: "表示",
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 検索バー */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="コマンドを検索... (例: 保存、エクスポート)"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-lg"
            />
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-700 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* コマンドリスト */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              コマンドが見つかりません
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, cmds]) => (
              <div key={group} className="py-2">
                <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {groupLabels[group] || group}
                </div>
                {cmds.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-700 transition-colors ${
                        isSelected ? "bg-slate-700" : ""
                      }`}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div className="flex items-center gap-3">
                        {cmd.icon && (
                          <span className="text-slate-400">{cmd.icon}</span>
                        )}
                        <span className="text-slate-100">{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <kbd className="px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-700 rounded">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>↑↓ で選択</span>
            <span>Enter で実行</span>
          </div>
          <span>Esc で閉じる</span>
        </div>
      </div>
    </div>
  );
}


