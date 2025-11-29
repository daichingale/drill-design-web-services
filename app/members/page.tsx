// app/members/page.tsx
"use client";

import { ChangeEvent, useEffect } from "react";
import { useMembers } from "@/context/MembersContext";
import { useMenu } from "@/context/MenuContext";
import { PART_LIST } from "../constants/parts";
import {
  saveMembersToLocalStorage,
  loadMembersFromLocalStorage,
  exportMembersToJSON,
  importMembersFromJSON,
} from "@/lib/drill/storage";

export default function MembersPage() {
  const { members, setMembers } = useMembers();
  const { setMenuGroups } = useMenu();

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

  // メニューグループをレイアウトのメニューバーに登録
  useEffect(() => {
    const menuGroups = [
      {
        label: "ファイル",
        items: [
          {
            label: "保存",
            icon: "💾",
            shortcut: "Ctrl+S",
            action: handleSave,
          },
          {
            label: "読み込み",
            icon: "📂",
            shortcut: "Ctrl+O",
            action: handleLoad,
          },
          { divider: true },
          {
            label: "JSON形式でエクスポート",
            icon: "📦",
            action: handleExportJSON,
          },
          { divider: true },
          {
            label: "JSON形式からインポート",
            icon: "📦",
            action: handleImportJSON,
          },
        ],
      },
    ];

    setMenuGroups(menuGroups);
    return () => {
      // ページから離れるときにメニューをクリア
      setMenuGroups([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMenuGroups, members]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">メンバー管理</h1>
          <p className="text-sm text-slate-400 mt-1">
            メンバーの情報を管理します。編集内容はドリルエディタに反映されます。
          </p>
        </div>
      </div>

      <button
        onClick={addMember}
        className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
      >
        ＋ メンバー追加
      </button>

      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">名前</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">楽器</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">色</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/50">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-slate-200 font-mono text-xs">{m.id}</td>

                {/* 名前 */}
                <td className="px-4 py-3">
                  <input
                    type="text"
                    className="w-full rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                    value={m.name}
                    onChange={(e) =>
                      updateField(m.id, "name", e.target.value)
                    }
                  />
                </td>

                {/* パート：プルダウン */}
                <td className="px-4 py-3">
                  <select
                    value={m.part}
                    onChange={(e) =>
                      updateField(m.id, "part", e.target.value)
                    }
                    className="w-full rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                  >
                    {PART_LIST.map((p) => (
                      <option key={p} value={p} className="bg-slate-800">
                        {p}
                      </option>
                    ))}
                  </select>
                </td>

                {/* 色 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={m.color ?? "#888888"}
                      onChange={(e) =>
                        updateField(m.id, "color", e.target.value)
                      }
                      className="w-10 h-10 rounded border border-slate-600 bg-slate-700/30 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      {m.color}
                    </span>
                  </div>
                </td>

                {/* 削除 */}
                <td className="px-4 py-3 text-right">
                  <button
                    className="px-3 py-1.5 text-xs rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 transition-colors"
                    onClick={() => deleteMember(m.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}

            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-slate-400">メンバーがいません</p>
                    <p className="text-xs text-slate-500">「メンバー追加」から登録してください</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3">
        <p className="text-xs text-slate-400">
          💡 ここで編集した内容はそのままドリルエディタに反映されます。
        </p>
      </div>
    </div>
  );
}
