// components/drill/SearchFilterPanel.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Member } from "@/context/MembersContext";
import type { UiSet } from "@/lib/drill/uiTypes";

type SearchFilterPanelProps = {
  members: Member[];
  sets: UiSet[];
  onFilterMembers: (filteredIds: string[]) => void;
  onFilterSets: (filteredIds: string[]) => void;
};

export default function SearchFilterPanel({
  members,
  sets,
  onFilterMembers,
  onFilterSets,
}: SearchFilterPanelProps) {
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberPartFilter, setMemberPartFilter] = useState<string>("");
  const [setSearchQuery, setSetSearchQuery] = useState("");
  const [countRangeFilter, setCountRangeFilter] = useState<{ min: number; max: number } | null>(null);

  // メンバーのフィルタリング
  const filteredMemberIds = useMemo(() => {
    let filtered = members;

    // 名前で検索
    if (memberSearchQuery) {
      const query = memberSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
      );
    }

    // パートでフィルタ
    if (memberPartFilter) {
      filtered = filtered.filter((m) => m.part === memberPartFilter);
    }

    return filtered.map((m) => m.id);
  }, [members, memberSearchQuery, memberPartFilter]);

  // セットのフィルタリング
  const filteredSetIds = useMemo(() => {
    let filtered = sets;

    // 名前で検索
    if (setSearchQuery) {
      const query = setSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
    }

    // カウント範囲でフィルタ
    if (countRangeFilter) {
      filtered = filtered.filter(
        (s) =>
          s.startCount >= countRangeFilter.min &&
          s.startCount <= countRangeFilter.max
      );
    }

    return filtered.map((s) => s.id);
  }, [sets, setSearchQuery, countRangeFilter]);

  // フィルタ結果を親に通知
  useEffect(() => {
    onFilterMembers(filteredMemberIds);
  }, [filteredMemberIds, onFilterMembers]);

  useEffect(() => {
    onFilterSets(filteredSetIds);
  }, [filteredSetIds, onFilterSets]);

  // パート一覧を取得
  const parts = useMemo(() => {
    const partSet = new Set(members.map((m) => m.part).filter(Boolean));
    return Array.from(partSet).sort();
  }, [members]);

  // カウント範囲を計算
  const countRange = useMemo(() => {
    if (sets.length === 0) return { min: 0, max: 0 };
    const counts = sets.map((s) => s.startCount);
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
    };
  }, [sets]);

  return (
    <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/60 max-h-[400px] overflow-y-auto sidebar-scrollbar">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">🔍 検索・フィルタ</h3>

      {/* メンバー検索 */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">メンバー検索</label>
        <input
          type="text"
          value={memberSearchQuery}
          onChange={(e) => setMemberSearchQuery(e.target.value)}
          placeholder="名前で検索..."
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500"
        />
        <select
          value={memberPartFilter}
          onChange={(e) => setMemberPartFilter(e.target.value)}
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200"
        >
          <option value="">すべてのパート</option>
          {parts.map((part) => (
            <option key={part} value={part}>
              {part}
            </option>
          ))}
        </select>
        <div className="text-xs text-slate-500">
          {filteredMemberIds.length} / {members.length} 件
        </div>
      </div>

      {/* セット検索 */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">セット検索</label>
        <input
          type="text"
          value={setSearchQuery}
          onChange={(e) => setSetSearchQuery(e.target.value)}
          placeholder="セット名で検索..."
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={countRangeFilter?.min ?? countRange.min}
            onChange={(e) =>
              setCountRangeFilter({
                min: Number(e.target.value),
                max: countRangeFilter?.max ?? countRange.max,
              })
            }
            placeholder="最小カウント"
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200"
          />
          <input
            type="number"
            value={countRangeFilter?.max ?? countRange.max}
            onChange={(e) =>
              setCountRangeFilter({
                min: countRangeFilter?.min ?? countRange.min,
                max: Number(e.target.value),
              })
            }
            placeholder="最大カウント"
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200"
          />
        </div>
        <div className="text-xs text-slate-500">
          {filteredSetIds.length} / {sets.length} 件
        </div>
      </div>

      {/* リセットボタン */}
      <button
        onClick={() => {
          setMemberSearchQuery("");
          setMemberPartFilter("");
          setSetSearchQuery("");
          setCountRangeFilter(null);
        }}
        className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
      >
        フィルタをリセット
      </button>
    </div>
  );
}



