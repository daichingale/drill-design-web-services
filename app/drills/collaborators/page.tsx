// app/drills/collaborators/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Collaborator = {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
};

type DrillInfo = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
};

export default function CollaboratorsManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const drillId = searchParams.get("drillId");

  const [drill, setDrill] = useState<DrillInfo | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"editor" | "viewer">("editor");

  // 認証チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (!drillId) return;

    try {
      setLoading(true);
      
      // ドリル情報を取得
      const drillResponse = await fetch(`/api/drills/${drillId}`);
      if (!drillResponse.ok) {
        let errorMessage = "ドリル情報の取得に失敗しました";
        try {
          const errorData = await drillResponse.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          if (drillResponse.status === 404) {
            errorMessage = "ドリルが見つかりませんでした";
          } else if (drillResponse.status === 403) {
            errorMessage = "このドリルにアクセスする権限がありません";
          } else if (drillResponse.status === 401) {
            errorMessage = "認証が必要です。再度ログインしてください";
            router.push("/auth/signin");
            return;
          }
        } catch (parseError) {
          // JSON解析に失敗した場合はデフォルトメッセージを使用
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(`${errorMessage} (HTTP ${drillResponse.status})`);
      }
      const drillData = await drillResponse.json();
      setDrill({
        id: drillData.id,
        title: drillData.title || "無題",
        ownerId: drillData.userId,
        ownerName: drillData.user?.name || drillData.user?.email || "不明",
      });

      // 共同編集者一覧を取得
      const collaboratorsResponse = await fetch(`/api/drills/${drillId}/collaborators`);
      if (!collaboratorsResponse.ok) {
        let errorMessage = "共同編集者一覧の取得に失敗しました";
        try {
          const errorData = await collaboratorsResponse.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(`${errorMessage} (HTTP ${collaboratorsResponse.status})`);
      }
      const collaboratorsData = await collaboratorsResponse.json();
      setCollaborators(collaboratorsData);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [drillId, router]);

  useEffect(() => {
    if (status === "authenticated" && drillId) {
      fetchData();
    }
  }, [status, drillId, fetchData]);

  const handleAddCollaborator = async () => {
    if (!drillId || !newUserEmail.trim()) {
      alert("メールアドレスを入力してください");
      return;
    }

    try {
      setAddingUser(true);
      
      // まずユーザーを検索
      const searchResponse = await fetch(`/api/users/search?email=${encodeURIComponent(newUserEmail)}`);
      if (!searchResponse.ok) {
        throw new Error("ユーザーの検索に失敗しました");
      }
      const userData = await searchResponse.json();
      
      if (!userData.id) {
        alert("指定されたメールアドレスのユーザーが見つかりませんでした");
        return;
      }

      // 共同編集者を追加
      const addResponse = await fetch(`/api/drills/${drillId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.id,
          role: newUserRole,
        }),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        throw new Error(errorData.error || "共同編集者の追加に失敗しました");
      }

      // 一覧を更新
      await fetchData();
      setNewUserEmail("");
      setNewUserRole("editor");
    } catch (err) {
      console.error("Error adding collaborator:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(errorMessage);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!drillId) return;
    
    if (!confirm("この共同編集者を削除しますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/drills/${drillId}/collaborators?collaboratorId=${collaboratorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("共同編集者の削除に失敗しました");
      }

      // 一覧を更新
      await fetchData();
    } catch (err) {
      console.error("Error removing collaborator:", err);
      alert("共同編集者の削除に失敗しました");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!drillId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">ドリルIDが指定されていません</p>
          <Link
            href="/drills"
            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium transition-all duration-200"
          >
            ドリル一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = drill && session?.user?.id === drill.ownerId;
  const currentUserCollaborator = collaborators.find(
    (c) => c.userId === session?.user?.id
  );
  const isEditor = currentUserCollaborator?.role === "editor";
  const canManageCollaborators = isOwner || isEditor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                共同編集者管理
              </h1>
              {drill && (
                <p className="text-slate-400 mt-2">
                  ドリル: {drill.title} (作成者: {drill.ownerName})
                </p>
              )}
              {!isOwner && isEditor && (
                <p className="text-blue-400 mt-1 text-sm">
                  編集者としてアクセス中
                </p>
              )}
            </div>
            <Link
              href={`/drill?id=${drillId}`}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ドリルに戻る
            </Link>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200">
            <p>エラー: {error}</p>
          </div>
        )}

        {/* オーナーまたは編集者のみ表示: 共同編集者追加フォーム */}
        {canManageCollaborators && (
          <div className="mb-6 p-6 rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">共同編集者を追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  権限
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "editor" | "viewer")}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                >
                  <option value="editor">編集者（編集可能）</option>
                  <option value="viewer">閲覧者（閲覧のみ）</option>
                </select>
              </div>
              <button
                onClick={handleAddCollaborator}
                disabled={addingUser || !newUserEmail.trim()}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {addingUser ? "追加中..." : "共同編集者を追加"}
              </button>
            </div>
          </div>
        )}

        {/* 共同編集者一覧 */}
        <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm shadow-xl">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">
              共同編集者一覧 ({collaborators.length}人)
            </h2>
            {collaborators.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                共同編集者がいません
              </p>
            ) : (
              <div className="space-y-3">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/40 border border-slate-700/60"
                  >
                    <div className="flex items-center gap-4">
                      {collaborator.user.image ? (
                        <img
                          src={collaborator.user.image}
                          alt={collaborator.user.name || collaborator.user.email}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold">
                          {(collaborator.user.name || collaborator.user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-slate-200 font-medium">
                          {collaborator.user.name || collaborator.user.email}
                        </p>
                        <p className="text-sm text-slate-400">
                          {collaborator.user.email}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        collaborator.role === "editor"
                          ? "bg-blue-900/40 border border-blue-500/60 text-blue-200"
                          : "bg-slate-700/60 border border-slate-600/60 text-slate-300"
                      }`}>
                        {collaborator.role === "editor" ? "編集者" : "閲覧者"}
                      </span>
                    </div>
                    {canManageCollaborators && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="px-4 py-2 rounded-md bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200"
                        disabled={!isOwner && collaborator.role === "editor"}
                        title={!isOwner && collaborator.role === "editor" ? "編集者は他の編集者を削除できません" : "削除"}
                      >
                        削除
                      </button>
                    )}
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

