// components/drill/DrillSidePanel.tsx
"use client";

import type { WorldPos } from "../../lib/drill/types";

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
};

export default function DrillSidePanel({
  members,
  selectedIds,
  currentSetPositions,
}: Props) {
  const singleSelectedId =
    selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <div className="min-w-[200px] rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-3 shadow-xl">
      <h2 className="text-xs font-semibold mb-4 text-slate-200 uppercase tracking-wider border-b border-slate-700/60 pb-2">
        選択中のメンバー
      </h2>

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
    </div>
  );
}
