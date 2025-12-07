// components/drill/CollaboratorsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Collaborator = {
  id: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
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
  isOwner: boolean;
};

export default function CollaboratorsPanel({ drillId, isOwner }: Props) {
  const { data: session } = useSession();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollaborators();
  }, [drillId]);

  const loadCollaborators = async () => {
    try {
      const response = await fetch(`/api/drills/${drillId}/collaborators`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error("Failed to load collaborators:", error);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !isOwner) return;

    setLoading(true);
    try {
      // まずユーザーを検索
      const userResponse = await fetch(`/api/users/search?email=${encodeURIComponent(newUserEmail.trim())}`);
      
      if (!userResponse.ok) {
        let errorMessage = "ユーザーが見つかりません";
        try {
          const errorData = await userResponse.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // JSON解析に失敗した場合はデフォルトメッセージを使用
        }
        alert(errorMessage);
        setLoading(false);
        return;
      }
      
      const user = await userResponse.json();
      
      if (!user || !user.id) {
        alert("ユーザー情報の取得に失敗しました");
        setLoading(false);
        return;
      }

      // 共同編集者を追加
      const response = await fetch(`/api/drills/${drillId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: newUserRole,
        }),
      });

      if (response.ok) {
        setNewUserEmail("");
        loadCollaborators();
        alert(`${user.name || user.email}を共同編集者として追加しました`);
      } else {
        let errorMessage = "共同編集者の追加に失敗しました";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            console.error("[CollaboratorsPanel] Failed to add collaborator:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              drillId,
              userId: user.id,
              role: newUserRole,
            });
          } else {
            const text = await response.text();
            errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
            console.error("[CollaboratorsPanel] Failed to add collaborator (non-JSON response):", {
              status: response.status,
              statusText: response.statusText,
              responseText: text.substring(0, 500),
              drillId,
              userId: user.id,
              role: newUserRole,
            });
          }
        } catch (parseError) {
          console.error("[CollaboratorsPanel] Failed to parse error response:", {
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            status: response.status,
            statusText: response.statusText,
            drillId,
            userId: user.id,
            role: newUserRole,
          });
        }
        alert(errorMessage);
      }
    } catch (error) {
      // エラーオブジェクトの詳細を取得
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      };
      console.error("[CollaboratorsPanel] Failed to add collaborator (catch block):", errorDetails);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : error && typeof error === 'object' && 'toString' in error
        ? error.toString()
        : "予期しないエラーが発生しました";
      alert(`共同編集者の追加に失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!isOwner || !confirm("この共同編集者を削除しますか？")) return;

    try {
      const response = await fetch(
        `/api/drills/${drillId}/collaborators?collaboratorId=${collaboratorId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        loadCollaborators();
      }
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700/80 p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-200">共同編集者</h3>
      
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {collaborators.map((collab) => (
          <div
            key={collab.id}
            className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50"
          >
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-200">
                {collab.user.name || collab.user.email || "Unknown"}
              </div>
              <div className="text-xs text-slate-400">
                {collab.role === "owner" ? "オーナー" : collab.role === "editor" ? "編集者" : "閲覧者"}
              </div>
            </div>
            {isOwner && collab.role !== "owner" && (
              <button
                onClick={() => handleRemoveCollaborator(collab.id)}
                className="px-2 py-1 text-xs rounded bg-red-600/50 hover:bg-red-600 text-white"
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={handleAddCollaborator} className="space-y-2">
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="ユーザーのメールアドレス"
            className="w-full px-2 py-1.5 text-xs rounded bg-slate-700/50 border border-slate-600 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as "editor" | "viewer")}
            className="w-full px-2 py-1.5 text-xs rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          >
            <option value="editor">編集者</option>
            <option value="viewer">閲覧者</option>
          </select>
          <button
            type="submit"
            disabled={loading || !newUserEmail.trim()}
            className="w-full px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </form>
      )}
    </div>
  );
}

