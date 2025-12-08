"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Branch = {
  id: string;
  name: string;
  description?: string;
  drillId: string;
  baseBranchId?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName?: string;
  isCurrent: boolean;
};

type BranchManagementViewProps = {
  drillId: string;
  onClose: () => void;
  onSwitchBranch?: (branchId: string) => void;
};

/**
 * ブランチ管理ビュー
 */
export default function BranchManagementView({
  drillId,
  onClose,
  onSwitchBranch,
}: BranchManagementViewProps) {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchDescription, setNewBranchDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadBranches();
  }, [drillId]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drills/${drillId}/branches`);
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) {
      alert("ブランチ名を入力してください");
      return;
    }

    try {
      const response = await fetch(`/api/drills/${drillId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBranchName,
          description: newBranchDescription,
        }),
      });

      if (response.ok) {
        setNewBranchName("");
        setNewBranchDescription("");
        setShowCreateForm(false);
        loadBranches();
      } else {
        const error = await response.json();
        alert(error.message || "ブランチの作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create branch:", error);
      alert("ブランチの作成に失敗しました");
    }
  };

  const switchBranch = async (branchId: string) => {
    if (onSwitchBranch) {
      onSwitchBranch(branchId);
    } else {
      // デフォルトの動作: ページをリロード
      window.location.href = `/drill?id=${drillId}&branch=${branchId}`;
    }
  };

  const mergeBranch = async (sourceBranchId: string, targetBranchId: string) => {
    if (!confirm("このブランチをマージしますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/drills/${drillId}/branches/${sourceBranchId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBranchId }),
      });

      if (response.ok) {
        alert("ブランチのマージが完了しました");
        loadBranches();
      } else {
        const error = await response.json();
        alert(error.message || "ブランチのマージに失敗しました");
      }
    } catch (error) {
      console.error("Failed to merge branch:", error);
      alert("ブランチのマージに失敗しました");
    }
  };

  const deleteBranch = async (branchId: string) => {
    if (!confirm("このブランチを削除しますか？\nこの操作は取り消せません。")) {
      return;
    }

    try {
      const response = await fetch(`/api/drills/${drillId}/branches/${branchId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadBranches();
      } else {
        const error = await response.json();
        alert(error.message || "ブランチの削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete branch:", error);
      alert("ブランチの削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100">
      <div className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-bold">ブランチ管理</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ブランチ作成フォーム */}
          {showCreateForm && (
            <div className="mb-6 p-4 rounded-lg border border-slate-700 bg-slate-800/50">
              <h3 className="text-lg font-semibold mb-4">新しいブランチを作成</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ブランチ名</label>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="例: feature/new-formation"
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">説明（オプション）</label>
                  <textarea
                    value={newBranchDescription}
                    onChange={(e) => setNewBranchDescription(e.target.value)}
                    placeholder="このブランチの説明を入力..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createBranch}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBranchName("");
                      setNewBranchDescription("");
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ブランチ一覧 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">ブランチ一覧</h3>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  + 新しいブランチ
                </button>
              )}
            </div>

            {branches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-4">ブランチがありません</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  最初のブランチを作成
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`p-4 rounded-lg border ${
                      branch.isCurrent
                        ? "border-emerald-500 bg-emerald-900/20"
                        : "border-slate-700 bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{branch.name}</span>
                          {branch.isCurrent && (
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-600 text-white">
                              現在のブランチ
                            </span>
                          )}
                        </div>
                        {branch.description && (
                          <p className="text-sm text-slate-400 mb-2">{branch.description}</p>
                        )}
                        <div className="text-xs text-slate-500">
                          <div>作成: {new Date(branch.createdAt).toLocaleString("ja-JP")}</div>
                          <div>更新: {new Date(branch.updatedAt).toLocaleString("ja-JP")}</div>
                          {branch.userName && <div>作成者: {branch.userName}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!branch.isCurrent && (
                          <>
                            <button
                              onClick={() => switchBranch(branch.id)}
                              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
                            >
                              切り替え
                            </button>
                            <button
                              onClick={() => {
                                const currentBranch = branches.find(b => b.isCurrent);
                                if (currentBranch) {
                                  mergeBranch(branch.id, currentBranch.id);
                                }
                              }}
                              className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors"
                            >
                              マージ
                            </button>
                          </>
                        )}
                        {!branch.isCurrent && (
                          <button
                            onClick={() => deleteBranch(branch.id)}
                            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-sm transition-colors"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

