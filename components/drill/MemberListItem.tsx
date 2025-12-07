// components/drill/MemberListItem.tsx
"use client";

import { memo } from "react";
import { PART_LIST } from "../../app/constants/parts";
import type { BasicMember } from "@/context/MembersContext";

type MemberListItemProps = {
  member: BasicMember;
  index: number;
  draggedMemberIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDeleteMember?: (id: string) => void;
  onUpdateMember?: (id: string, field: "name" | "part" | "color", value: string) => void;
  onReorderMembers?: boolean;
};

const MemberListItem = memo(({
  member,
  index,
  draggedMemberIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onDeleteMember,
  onUpdateMember,
  onReorderMembers,
}: MemberListItemProps) => {
  return (
    <div
      key={member.id}
      draggable={!!onReorderMembers}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`p-2.5 rounded-md bg-slate-800/40 border border-slate-700/40 space-y-2 transition-all ${
        draggedMemberIndex === index ? "opacity-50" : ""
      } ${
        dragOverIndex === index ? "border-emerald-500 border-2 bg-slate-800/60" : ""
      } ${
        onReorderMembers ? "cursor-move" : ""
      }`}
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
            {member.color ?? "#888888"}
          </span>
        </div>
      )}
    </div>
  );
});

MemberListItem.displayName = "MemberListItem";

export default MemberListItem;


