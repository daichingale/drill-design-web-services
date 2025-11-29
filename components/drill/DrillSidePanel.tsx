// components/drill/DrillSidePanel.tsx
"use client";

import { useState } from "react";
import type { WorldPos } from "../../lib/drill/types";
import { PART_LIST } from "../../app/constants/parts";
import {
  exportMembersToJSON,
  importMembersFromJSON,
} from "@/lib/drill/storage";

type BasicMember = {
  id: string;
  name: string;
  part: string;
  color?: string;
};

type Props = {
  members: BasicMember[];
  selectedIds: string[];
  // いま表示しているセットの座標（currentSet.positions を渡す想定）
  currentSetPositions: Record<string, WorldPos>;
  // メンバー管理機能
  onAddMember?: () => void;
  onDeleteMember?: (id: string) => void;
  onUpdateMember?: (id: string, field: "name" | "part" | "color", value: string) => void;
  onImportMembers?: (members: BasicMember[]) => void;
};

type TabType = "selection" | "management";

export default function DrillSidePanel({
  members,
  selectedIds,
  currentSetPositions,
  onAddMember,
  onDeleteMember,
  onUpdateMember,
  onImportMembers,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("selection");
  const singleSelectedId =
    selectedIds.length === 1 ? selectedIds[0] : null;

  const handleExportJSON = () => {
    const json = exportMembersToJSON(members as any);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonString = event.target?.result as string;
        const importedMembers = importMembersFromJSON(jsonString);
        
        if (importedMembers && importedMembers.length > 0) {
          if (confirm("現在のメンバーデータを上書きしますか？")) {
            if (onImportMembers) {
              onImportMembers(importedMembers as BasicMember[]);
            } else {
              alert("インポート機能を使用するには、親コンポーネントでonImportMembersを実装してください。");
            }
          }
        } else {
          alert("インポートに失敗しました。ファイル形式を確認してください。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-w-[200px] rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col">
      {/* タブ */}
      <div className="flex border-b border-slate-700/60 bg-slate-800/40">
        <button
          onClick={() => setActiveTab("selection")}
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === "selection"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          選択中
        </button>
        <button
          onClick={() => setActiveTab("management")}
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === "management"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          メンバー管理
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className={`flex-1 p-3 min-h-0 ${
        activeTab === "management" ? "overflow-hidden" : "overflow-y-auto sidebar-scrollbar"
      }`}>
        {activeTab === "selection" ? (
          // 選択中のメンバー表示
          <>
            {singleSelectedId ? (
              (() => {
                const member = members.find((m) => m.id === singleSelectedId);
                const pos = currentSetPositions[singleSelectedId];

                if (!member || !pos) {
                  return (
                    <p className="text-slate-400 text-sm">
                      座標情報が見つかりません。
                    </p>
                  );
                }

                return (
                  <div className="text-sm space-y-3 text-slate-200">
                    <div className="p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                      <p className="text-xs text-slate-400/90 mb-1 uppercase tracking-wider">ID</p>
                      <p className="font-mono text-slate-200">{member.id}</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                      <p className="text-xs text-slate-400/90 mb-1 uppercase tracking-wider">名前</p>
                      <p className="text-slate-200">{member.name}</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                      <p className="text-xs text-slate-400/90 mb-1 uppercase tracking-wider">パート</p>
                      <p className="text-slate-200">{member.part}</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                      <p className="text-xs text-slate-400/90 mb-1 uppercase tracking-wider">座標</p>
                      <p className="font-mono text-slate-200">x={pos.x.toFixed(2)} / y={pos.y.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })()
            ) : selectedIds.length > 1 ? (
              <div className="text-sm">
                <div className="mb-3 p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                  <p className="text-xs text-slate-400/90 mb-1 uppercase tracking-wider">選択中</p>
                  <p className="text-slate-200 font-semibold">{selectedIds.length}人</p>
                </div>
                <div className="max-h-40 overflow-auto space-y-1.5">
                  {selectedIds.map((id) => {
                    const m = members.find((mm) => mm.id === id);
                    if (!m) return null;
                    return (
                      <div key={id} className="p-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-xs">
                        <p className="font-mono text-slate-400/80 text-[10px] mb-0.5">{m.id}</p>
                        <p className="text-slate-200">{m.name} <span className="text-slate-400/70">({m.part})</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed">
                <p className="text-slate-400/80 text-sm text-center leading-relaxed">
                  ドットをクリックしてください。
                  <br />
                  <span className="text-xs">（Ctrl+クリックで複数選択）</span>
                </p>
              </div>
            )}
          </>
        ) : (
          // メンバー管理
          <div className="flex flex-col h-full">
            {/* ヘッダー（固定） */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                メンバー一覧 ({members.length})
              </h3>
              {onAddMember && (
                <button
                  onClick={onAddMember}
                  className="px-2.5 py-1 text-xs rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors font-medium"
                  title="メンバーを追加"
                >
                  ＋ 追加
                </button>
              )}
            </div>

            {/* メンバーリスト（スクロール可能） */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar min-h-0">
              {members.length === 0 ? (
                <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed text-center">
                  <p className="text-slate-400/80 text-sm">
                    メンバーがいません
                  </p>
                  {onAddMember && (
                    <button
                      onClick={onAddMember}
                      className="mt-3 px-3 py-1.5 text-xs rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                    >
                      メンバーを追加
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40 space-y-2"
                    >
                      {/* IDと削除ボタン */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400/80">{member.id}</span>
                        {onDeleteMember && (
                          <button
                            onClick={() => {
                              if (confirm(`「${member.name}」を削除しますか？`)) {
                                onDeleteMember(member.id);
                              }
                            }}
                            className="px-2 py-0.5 text-[10px] rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 transition-colors"
                            title="削除"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      {/* 名前 */}
                      {onUpdateMember ? (
                        <input
                          type="text"
                          className="w-full rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                          value={member.name}
                          onChange={(e) => onUpdateMember(member.id, "name", e.target.value)}
                        />
                      ) : (
                        <p className="text-sm text-slate-200">{member.name}</p>
                      )}

                      {/* パート */}
                      {onUpdateMember ? (
                        <select
                          value={member.part}
                          onChange={(e) => onUpdateMember(member.id, "part", e.target.value)}
                          className="w-full rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                        >
                          {PART_LIST.map((p) => (
                            <option key={p} value={p} className="bg-slate-800">
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-400">{member.part}</p>
                      )}

                      {/* 色 */}
                      {onUpdateMember && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={member.color ?? "#888888"}
                            onChange={(e) => onUpdateMember(member.id, "color", e.target.value)}
                            className="w-8 h-8 rounded border border-slate-600 bg-slate-700/30 cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {member.color}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* エクスポート/インポート（固定） */}
            <div className="pt-3 mt-3 border-t border-slate-700/60 space-y-2 shrink-0">
              <button
                onClick={handleExportJSON}
                className="w-full px-3 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 transition-colors"
              >
                📦 JSON形式でエクスポート
              </button>
              <button
                onClick={handleImportJSON}
                className="w-full px-3 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 transition-colors"
              >
                📦 JSON形式からインポート
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
