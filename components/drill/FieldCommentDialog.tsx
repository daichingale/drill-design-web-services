// components/drill/FieldCommentDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Comment = {
  id: string;
  content: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  drillId: string;
  existingComment?: Comment | null;
  onCommentAdded?: () => void;
  onCommentUpdated?: () => void;
};

export default function FieldCommentDialog({
  isOpen,
  onClose,
  position,
  drillId,
  existingComment,
  onCommentAdded,
  onCommentUpdated,
}: Props) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (existingComment) {
      setContent(existingComment.content);
    } else {
      setContent("");
    }
  }, [existingComment]);

  // @メンション検索
  useEffect(() => {
    if (mentionQuery.length > 0) {
      const searchUsers = async () => {
        try {
          const response = await fetch(
            `/api/users/search?q=${encodeURIComponent(mentionQuery)}`
          );
          if (response.ok) {
            const users = await response.json();
            setMentionUsers(users);
            setShowMentions(true);
          }
        } catch (error) {
          console.error("Failed to search users:", error);
        }
      };
      searchUsers();
    } else {
      setShowMentions(false);
      setMentionUsers([]);
    }
  }, [mentionQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !session?.user?.id || !position) return;

    setLoading(true);
    try {
      if (existingComment) {
        // 更新
        const response = await fetch(
          `/api/drills/${drillId}/comments/${existingComment.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: content.trim(),
            }),
          }
        );

        if (response.ok) {
          onCommentUpdated?.();
          onClose();
        }
      } else {
        // 新規作成
        const response = await fetch(`/api/drills/${drillId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "field",
            entityId: null,
            content: content.trim(),
            x: position.x,
            y: position.y,
          }),
        });

        if (response.ok) {
          onCommentAdded?.();
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to save comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMentionSelect = (user: any) => {
    const mention = `@${user.name || user.email} `;
    setContent((prev) => prev + mention);
    setMentionQuery("");
    setShowMentions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 w-full max-w-md">
        <h3 className="text-sm font-semibold mb-3 text-slate-200">
          {existingComment ? "コメントを編集" : "コメントを追加"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => {
                const value = e.target.value;
                setContent(value);
                
                // @メンション検出
                const match = value.match(/@(\w+)$/);
                if (match) {
                  setMentionQuery(match[1]);
                } else {
                  setMentionQuery("");
                }
              }}
              placeholder="コメントを入力... (@でメンション)"
              className="w-full px-3 py-2 text-sm rounded bg-slate-700/50 border border-slate-600 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={4}
              disabled={loading}
            />

            {/* メンション候補 */}
            {showMentions && mentionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {mentionUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleMentionSelect(user)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    <div className="font-semibold">{user.name || user.email}</div>
                    {user.email && user.name && (
                      <div className="text-xs text-slate-400">{user.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "保存中..." : existingComment ? "更新" : "追加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Comment = {
  id: string;
  content: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  drillId: string;
  existingComment?: Comment | null;
  onCommentAdded?: () => void;
  onCommentUpdated?: () => void;
};

export default function FieldCommentDialog({
  isOpen,
  onClose,
  position,
  drillId,
  existingComment,
  onCommentAdded,
  onCommentUpdated,
}: Props) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (existingComment) {
      setContent(existingComment.content);
    } else {
      setContent("");
    }
  }, [existingComment]);

  // @メンション検索
  useEffect(() => {
    if (mentionQuery.length > 0) {
      const searchUsers = async () => {
        try {
          const response = await fetch(
            `/api/users/search?q=${encodeURIComponent(mentionQuery)}`
          );
          if (response.ok) {
            const users = await response.json();
            setMentionUsers(users);
            setShowMentions(true);
          }
        } catch (error) {
          console.error("Failed to search users:", error);
        }
      };
      searchUsers();
    } else {
      setShowMentions(false);
      setMentionUsers([]);
    }
  }, [mentionQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !session?.user?.id || !position) return;

    setLoading(true);
    try {
      if (existingComment) {
        // 更新
        const response = await fetch(
          `/api/drills/${drillId}/comments/${existingComment.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: content.trim(),
            }),
          }
        );

        if (response.ok) {
          onCommentUpdated?.();
          onClose();
        }
      } else {
        // 新規作成
        const response = await fetch(`/api/drills/${drillId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "field",
            entityId: null,
            content: content.trim(),
            x: position.x,
            y: position.y,
          }),
        });

        if (response.ok) {
          onCommentAdded?.();
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to save comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMentionSelect = (user: any) => {
    const mention = `@${user.name || user.email} `;
    setContent((prev) => prev + mention);
    setMentionQuery("");
    setShowMentions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 w-full max-w-md">
        <h3 className="text-sm font-semibold mb-3 text-slate-200">
          {existingComment ? "コメントを編集" : "コメントを追加"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => {
                const value = e.target.value;
                setContent(value);
                
                // @メンション検出
                const match = value.match(/@(\w+)$/);
                if (match) {
                  setMentionQuery(match[1]);
                } else {
                  setMentionQuery("");
                }
              }}
              placeholder="コメントを入力... (@でメンション)"
              className="w-full px-3 py-2 text-sm rounded bg-slate-700/50 border border-slate-600 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={4}
              disabled={loading}
            />

            {/* メンション候補 */}
            {showMentions && mentionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {mentionUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleMentionSelect(user)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    <div className="font-semibold">{user.name || user.email}</div>
                    {user.email && user.name && (
                      <div className="text-xs text-slate-400">{user.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "保存中..." : existingComment ? "更新" : "追加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

