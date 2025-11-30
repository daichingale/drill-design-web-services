// app/auth/reset/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "パスワードリセットリクエストに失敗しました");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("パスワードリセットリクエストに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-6 text-emerald-400">
            メールを送信しました
          </h1>
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-200 text-sm">
            <p className="mb-2">
              パスワードリセット用のリンクを送信しました。
            </p>
            <p className="mb-2">
              メールアドレス <strong>{email}</strong> に送信されたリンクをクリックして、新しいパスワードを設定してください。
            </p>
            <p className="text-xs text-emerald-300 mt-4">
              ※ 開発環境では、サーバーログにリセットリンクが表示されます。
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors text-center"
            >
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-100">
          パスワードリセット
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="登録済みのメールアドレスを入力"
            />
            <p className="mt-1 text-xs text-slate-400">
              登録済みのメールアドレスにパスワードリセット用のリンクを送信します。
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {loading ? "送信中..." : "リセットリンクを送信"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/signin"
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

