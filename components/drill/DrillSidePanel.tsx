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
    <div className="min-w-[220px] border rounded p-3 bg-white">
      <h2 className="font-bold mb-2">選択中のメンバー</h2>

      {singleSelectedId ? (
        (() => {
          const member = members.find((m) => m.id === singleSelectedId);
          const pos = currentSetPositions[singleSelectedId];

          if (!member || !pos) {
            return (
              <p className="text-gray-500 text-sm">
                座標情報が見つかりません。
              </p>
            );
          }

          return (
            <div className="text-sm space-y-1">
              <p>
                <b>ID：</b>
                {member.id}
              </p>
              <p>
                <b>名前：</b>
                {member.name}
              </p>
              <p>
                <b>パート：</b>
                {member.part}
              </p>
              <p>
                <b>座標：</b>
                x={pos.x.toFixed(2)} / y={pos.y.toFixed(2)}
              </p>
            </div>
          );
        })()
      ) : selectedIds.length > 1 ? (
        <div className="text-sm">
          <p>{selectedIds.length}人選択中</p>
          <ul className="mt-1 list-disc list-inside text-xs text-gray-700 max-h-40 overflow-auto">
            {selectedIds.map((id) => {
              const m = members.find((mm) => mm.id === id);
              if (!m) return null;
              return (
                <li key={id}>
                  {m.id}：{m.name}（{m.part}）
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          ドットをクリックしてください。（Ctrl+クリックで複数選択）
        </p>
      )}
    </div>
  );
}
