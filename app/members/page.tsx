// app/members/page.tsx
"use client";

import { ChangeEvent, useEffect } from "react";
import { useMembers } from "@/context/MembersContext";
import { PART_LIST } from "../constants/parts";
import {
  saveMembersToLocalStorage,
  loadMembersFromLocalStorage,
  exportMembersToJSON,
  importMembersFromJSON,
} from "@/lib/drill/storage";

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

  const handleSave = () => {
    const success = saveMembersToLocalStorage(members);
    if (success) {
      alert("メンバーデータを保存しました");
    } else {
      alert("保存に失敗しました");
    }
  };

  const handleLoad = () => {
    if (confirm("現在のデータを上書きしますか？")) {
      const savedMembers = loadMembersFromLocalStorage();
      if (savedMembers && savedMembers.length > 0) {
        setMembers(() => savedMembers);
        alert("メンバーデータを読み込みました");
      } else {
        alert("保存されたデータが見つかりませんでした");
      }
    }
  };

  const handleExportJSON = () => {
    const json = exportMembersToJSON(members);
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
          if (confirm("現在のデータを上書きしますか？")) {
            setMembers(() => importedMembers);
            alert("メンバーデータをインポートしました");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンバー管理</h1>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleSave}
            className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
          >
            保存
          </button>
          <button
            onClick={handleLoad}
            className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
          >
            読み込み
          </button>
          <button
            onClick={handleExportJSON}
            className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
          >
            エクスポート
          </button>
          <button
            onClick={handleImportJSON}
            className="px-2 py-1 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
          >
            インポート
          </button>
        </div>
      </div>

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
