// components/drill/HistoryTimeline.tsx
"use client";

import { useState, useEffect } from "react";

type HistoryEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: any;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  createdAt: string;
};

type Props = {
  drillId: string;
  onRevert?: (historyId: string) => void;
};

export default function HistoryTimeline({ drillId, onRevert }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [drillId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drills/${drillId}/history?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: "作成",
      update: "更新",
      delete: "削除",
      move: "移動",
      add_member: "メンバー追加",
      remove_member: "メンバー削除",
      add_set: "セット追加",
      remove_set: "セット削除",
      REVERT: "取り消し",
      MERGE_BRANCH: "ブランチマージ",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action === "REVERT") return "text-red-400";
    if (action === "MERGE_BRANCH") return "text-purple-400";
    if (action === "delete" || action === "remove_member" || action === "remove_set")
      return "text-red-400";
    if (action === "create" || action === "add_member" || action === "add_set")
      return "text-emerald-400";
    return "text-blue-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700/80 p-4">
      <h3 className="text-sm font-semibold mb-4 text-slate-200">変更履歴タイムライン</h3>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            変更履歴はありません
          </p>
        ) : (
          <div className="relative">
            {/* タイムラインの縦線 */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />

            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative flex items-start gap-3 pl-8"
                  onMouseEnter={() => setSelectedEntry(entry.id)}
                  onMouseLeave={() => setSelectedEntry(null)}
                >
                  {/* タイムラインの点 */}
                  <div
                    className={`absolute left-3 top-2 w-2 h-2 rounded-full border-2 border-slate-700 ${
                      selectedEntry === entry.id
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-slate-600"
                    } transition-all`}
                  />

                  {/* エントリ内容 */}
                  <div
                    className={`flex-1 p-3 rounded-lg border transition-all ${
                      selectedEntry === entry.id
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-slate-700/30 border-slate-600/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200">
                        {entry.user.name || entry.user.email || "Unknown"}
                      </span>
                      <span
                        className={`text-xs font-medium ${getActionColor(
                          entry.action
                        )}`}
                      >
                        {getActionLabel(entry.action)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.createdAt).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {onRevert &&
                        entry.action !== "REVERT" &&
                        selectedEntry === entry.id && (
                          <button
                            onClick={() => onRevert(entry.id)}
                            className="ml-auto px-2 py-0.5 text-xs rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 transition-colors"
                            title="この変更を取り消す"
                          >
                            取り消し
                          </button>
                        )}
                    </div>
                    {entry.entityType && (
                      <div className="text-xs text-slate-400">
                        {entry.entityType}: {entry.entityId || "全体"}
                      </div>
                    )}
                    {entry.changes && typeof entry.changes === "object" && (
                      <details className="text-xs text-slate-500 mt-1">
                        <summary className="cursor-pointer hover:text-slate-400">
                          変更詳細を表示
                        </summary>
                        <pre className="mt-1 p-2 bg-slate-900/50 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
