// components/drill/CommentsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Comment = {
  id: string;
  userId: string;
  entityType: string;
  entityId: string | null;
  content: string;
  x: number | null;
  y: number | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

type Props = {
  drillId: string;
  entityType?: string;
  entityId?: string;
};

export default function CommentsPanel({ drillId, entityType, entityId }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [drillId, entityType, entityId]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/drills/${drillId}/comments`);
      if (response.ok) {
        const data = await response.json();
        // フィルタリング（entityTypeとentityIdが指定されている場合）
        const filtered = entityType && entityId
          ? data.filter((c: Comment) => c.entityType === entityType && c.entityId === entityId)
          : data.filter((c: Comment) => !c.entityType || c.entityType === "drill");
        setComments(filtered);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/drills/${drillId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: entityType || "drill",
          entityId: entityId || null,
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment("");
        loadComments();
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700/80 p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-200">コメント</h3>
      
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">コメントはありません</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-2 bg-slate-700/30 rounded border border-slate-600/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-200">
                  {comment.user.name || comment.user.email || "Unknown"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(comment.createdAt).toLocaleString("ja-JP")}
                </span>
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {session?.user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="flex-1 px-2 py-1.5 text-xs rounded bg-slate-700/50 border border-slate-600 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </form>
      )}
    </div>
  );
}

