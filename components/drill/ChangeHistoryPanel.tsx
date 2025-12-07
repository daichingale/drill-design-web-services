// components/drill/ChangeHistoryPanel.tsx
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

export default function ChangeHistoryPanel({ drillId, onRevert }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [drillId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drills/${drillId}/history?limit=50`);
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
    };
    return labels[action] || action;
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700/80 p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-200">変更履歴</h3>
      
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">読み込み中...</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">変更履歴はありません</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="p-2 bg-slate-700/30 rounded border border-slate-600/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    {entry.user.name || entry.user.email || "Unknown"}
                  </span>
                  <span className="text-xs text-emerald-400">
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.createdAt).toLocaleString("ja-JP")}
                  </span>
                  {onRevert && entry.action !== "REVERT" && (
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
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

