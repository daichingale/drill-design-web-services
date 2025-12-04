// components/drill/DrillSidePanel.tsx
"use client";

import { useState, useEffect } from "react";
import type { WorldPos } from "../../lib/drill/types";
import { PART_LIST } from "../../app/constants/parts";
import {
  exportMembersToJSON,
  importMembersFromJSON,
} from "@/lib/drill/storage";
import SearchFilterPanel from "./SearchFilterPanel";
import type { UiSet } from "@/lib/drill/uiTypes";

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
  sets?: UiSet[]; // 検索・フィルタ用
  // メンバー管理機能
  onAddMember?: () => void;
  onAddMultipleMembers?: (members: BasicMember[]) => void;
  onDeleteMember?: (id: string) => void;
  onUpdateMember?: (id: string, field: "name" | "part" | "color", value: string) => void;
  onImportMembers?: (members: BasicMember[]) => void;
  onFilterMembers?: (filteredIds: string[]) => void;
  onFilterSets?: (filteredIds: string[]) => void;
  // 選択順序の変更
  onReorderSelection?: (direction: 'up' | 'down') => void;
  onMoveSelectionOrder?: (fromIndex: number, toIndex: number) => void;
  // フォローザリーダーモード
  followLeaderMode?: boolean;
  onToggleFollowLeader?: () => void;
};

type TabType = "selection" | "management";

export default function DrillSidePanel({
  members,
  selectedIds,
  currentSetPositions,
  sets = [],
  onAddMember,
  onAddMultipleMembers,
  onDeleteMember,
  onUpdateMember,
  onImportMembers,
  onFilterMembers,
  onFilterSets,
  onReorderSelection,
  onMoveSelectionOrder,
  followLeaderMode = false,
  onToggleFollowLeader,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("selection");
  const [isMounted, setIsMounted] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAddPart, setBulkAddPart] = useState("Flute");
  const [bulkAddCount, setBulkAddCount] = useState(5);
  const [bulkAddStartNum, setBulkAddStartNum] = useState(1);
  const singleSelectedId =
    selectedIds.length === 1 ? selectedIds[0] : null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleBulkAdd = () => {
    if (!onAddMultipleMembers) {
      alert("一括追加機能が利用できません");
      return;
    }

    const newMembers: BasicMember[] = [];
    const existingIds = new Set(members.map((m) => m.id));

    const colors = [
      "#3498db",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#e67e22",
      "#16a085",
      "#c0392b",
    ];

    for (let i = 0; i < bulkAddCount; i++) {
      const num = bulkAddStartNum + i;
      const prefix = bulkAddPart.substring(0, 3).toUpperCase() || "MEM";
      let id = `${prefix}${num}`;

      let suffix = 0;
      while (existingIds.has(id)) {
        suffix++;
        id = `${prefix}${num}_${suffix}`;
      }
      existingIds.add(id);

      newMembers.push({
        id,
        name: `${bulkAddPart} ${num}`,
        part: bulkAddPart,
        color: colors[i % colors.length],
      });
    }

    onAddMultipleMembers(newMembers);
    setShowBulkAdd(false);
    setBulkAddCount(5);
    setBulkAddStartNum(1);
  };

  return (
    <div className="w-full flex flex-col min-h-[400px]">
      {/* タブ */}
      <div className="flex border-b border-slate-700/60 bg-slate-800/40 shrink-0">
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

                if (!member) {
                  return (
                    <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed">
                      <p className="text-slate-400 text-sm text-center">
                        メンバー情報が見つかりません。
                      </p>
                    </div>
                  );
                }

                if (!pos) {
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
                        <p className="text-slate-400/70 text-xs">未配置</p>
                      </div>
                    </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-400/90 uppercase tracking-wider">選択中</p>
                    <p className="text-slate-200 font-semibold">{selectedIds.length}人</p>
                  </div>
                  {onToggleFollowLeader && (
                    <button
                      onClick={onToggleFollowLeader}
                      className={`mt-2 w-full px-2 py-1 text-xs rounded-md transition-colors ${
                        followLeaderMode
                          ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                          : "bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
                      }`}
                      title="フォローザリーダーモード: 先頭のメンバーに他のメンバーが追従します"
                    >
                      {followLeaderMode ? "✓ フォローザリーダー ON" : "フォローザリーダー OFF"}
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-auto space-y-1.5">
                  {selectedIds.map((id, index) => {
                    const m = members.find((mm) => mm.id === id);
                    if (!m) return null;
                    const isLeader = index === 0;
                    return (
                      <div
                        key={id}
                        className={`p-2 rounded-md border text-xs ${
                          isLeader
                            ? "bg-emerald-900/30 border-emerald-500/50"
                            : "bg-slate-800/30 border-slate-700/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold ${
                              isLeader ? "text-emerald-300" : "text-slate-400/80"
                            }`}>
                              #{index + 1}
                            </span>
                            {isLeader && (
                              <span className="text-[10px] text-emerald-300 font-semibold">リーダー</span>
                            )}
                          </div>
                          {onMoveSelectionOrder && (
                            <div className="flex gap-1">
                              {index > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveSelectionOrder(index, index - 1);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
                                  title="順序を上に移動"
                                >
                                  ↑
                                </button>
                              )}
                              {index < selectedIds.length - 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveSelectionOrder(index, index + 1);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
                                  title="順序を下に移動"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                          )}
                          {!onMoveSelectionOrder && onReorderSelection && (
                            <div className="flex gap-1">
                              {index > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // 現在のインデックスまで上に移動するために、必要な回数だけ呼び出す
                                    // 簡易実装: 先頭に移動
                                    if (index === 1) {
                                      onReorderSelection('up');
                                    }
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
                                  title="順序を上に移動"
                                >
                                  ↑
                                </button>
                              )}
                              {index < selectedIds.length - 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // 最後尾に移動するために、必要な回数だけ呼び出す
                                    // 簡易実装: 1つ下に移動
                                    if (index === selectedIds.length - 2) {
                                      onReorderSelection('down');
                                    }
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
                                  title="順序を下に移動"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="font-mono text-slate-400/80 text-[10px] mb-0.5">{m.id}</p>
                        <p className="text-slate-200">{m.name} <span className="text-slate-400/70">({m.part})</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !isMounted ? (
              // SSRとの不整合を避けるため、初回レンダーは常に同じプレースホルダーを表示
              <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed">
                <p className="text-slate-400/80 text-sm text-center leading-relaxed">
                  ドットをクリックしてください。
                  <br />
                  <span className="text-xs">（Ctrl+クリックで複数選択）</span>
                </p>
              </div>
            ) : members.length === 0 ? (
              <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed space-y-3">
                <p className="text-slate-300 text-sm text-center leading-relaxed">
                  まだメンバーがいません。
                  <br />
                  まず「メンバー管理」タブからメンバーを追加してください。
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("management")}
                    className="px-3 py-1.5 text-xs rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                  >
                    メンバー管理を開く
                  </button>
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
            {/* 検索・フィルタパネル */}
            {(onFilterMembers || onFilterSets) && sets.length > 0 && (
              <div className="mb-3 shrink-0">
                <SearchFilterPanel
                  members={members as any}
                  sets={sets}
                  onFilterMembers={onFilterMembers || (() => {})}
                  onFilterSets={onFilterSets || (() => {})}
                />
              </div>
            )}

            {/* ヘッダー（固定） */}
            <div className="mb-3 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  メンバー一覧 ({members.length})
                </h3>
                <div className="flex gap-1">
                  {onAddMember && (
                    <button
                      onClick={onAddMember}
                      className="px-2.5 py-1 text-xs rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors font-medium"
                      title="メンバーを追加"
                    >
                      ＋ 追加
                    </button>
                  )}
                  {onAddMultipleMembers && (
                    <button
                      onClick={() => setShowBulkAdd((v) => !v)}
                      className="px-2.5 py-1 text-xs rounded-md bg-blue-600/80 hover:bg-blue-600 text-white transition-colors font-medium"
                      title="一括追加"
                    >
                      ＋ 一括
                    </button>
                  )}
                </div>
              </div>

              {showBulkAdd && onAddMultipleMembers && (
                <div className="p-3 rounded-md bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">
                    一括追加
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        パート
                      </label>
                      <select
                        value={bulkAddPart}
                        onChange={(e) => setBulkAddPart(e.target.value)}
                        className="w-full rounded bg-slate-700/40 border border-slate-600 px-2 py-1 text-xs text-slate-200"
                      >
                        {PART_LIST.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">
                          開始番号
                        </label>
                        <input
                          type="number"
                          value={bulkAddStartNum}
                          onChange={(e) =>
                            setBulkAddStartNum(Number(e.target.value))
                          }
                          min={1}
                          className="w-full rounded bg-slate-700/40 border border-slate-600 px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">
                          人数
                        </label>
                        <input
                          type="number"
                          value={bulkAddCount}
                          onChange={(e) =>
                            setBulkAddCount(Number(e.target.value))
                          }
                          min={1}
                          max={50}
                          className="w-full rounded bg-slate-700/40 border border-slate-600 px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleBulkAdd}
                        className="flex-1 px-3 py-1.5 text-xs rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                      >
                        追加
                      </button>
                      <button
                        onClick={() => setShowBulkAdd(false)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* メンバーリスト（スクロール可能） */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar min-h-0">
              {members.length === 0 ? (
                <div className="p-4 rounded-md bg-slate-800/30 border border-slate-700/40 border-dashed text-center space-y-3">
                  <p className="text-slate-300 text-sm">
                    まだメンバーがいません。
                  </p>
                  <p className="text-slate-400/80 text-xs leading-relaxed">
                    「メンバーを追加」で1人ずつ追加するか、
                    <br />
                    一括追加ボタンからパートと人数をまとめて登録できます。
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
