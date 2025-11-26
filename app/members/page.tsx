// app/members/page.tsx
"use client";

import { ChangeEvent } from "react";
import { useMembers } from "@/context/MembersContext";
import { PART_LIST } from "../constants/parts";

export default function MembersPage() {
  const { members, setMembers } = useMembers();

  const addMember = () => {
    const newIndex = members.length + 1;
    const newId = `M${newIndex}`;
    setMembers((prev) => [
      ...prev,
      {
        id: newId,
        name: `New Member ${newId}`,
        part: "Flute",
        color: "#888888",
      },
    ]);
  };

  const deleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateField = (
    id: string,
    field: "name" | "part" | "color",
    value: string
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value,
            }
          : m
      )
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">メンバー管理</h1>

      <button
        onClick={addMember}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
      >
        ＋ メンバー追加
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white border rounded">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">名前</th>
              <th className="px-3 py-2 text-left">楽器</th>
              <th className="px-3 py-2 text-left">色</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>

          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="px-3 py-2">{m.id}</td>

                {/* 名前 */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={m.name}
                    onChange={(e) =>
                      updateField(m.id, "name", e.target.value)
                    }
                  />
                </td>

                {/* ★★ パート：プルダウン化 ★★ */}
                <td className="px-3 py-2">
                  <select
                    value={m.part}
                    onChange={(e) =>
                      updateField(m.id, "part", e.target.value)
                    }
                    className="border rounded px-2 py-1 w-full"
                  >
                    {PART_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>

                {/* 色 */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={m.color ?? "#888888"}
                      onChange={(e) =>
                        updateField(m.id, "color", e.target.value)
                      }
                    />
                    <span className="text-xs text-gray-600">
                      {m.color}
                    </span>
                  </div>
                </td>

                {/* 削除 */}
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-red-600 text-xs"
                    onClick={() => deleteMember(m.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}

            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                  メンバーがいません。「メンバー追加」から登録してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        ※ ここで編集した内容はそのままドリルエディタに反映されます。
      </p>
    </div>
  );
}
