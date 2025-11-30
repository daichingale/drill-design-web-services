// app/auth/reset/confirm/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConfirmResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      // トークンの有効性を確認
      validateToken(tokenParam);
    } else {
      setError("リセットトークンが指定されていません");
      setValidating(false);
    }
  }, [searchParams]);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/auth/reset/validate?token=${encodeURIComponent(tokenValue)}`);
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "リセットトークンが無効または期限切れです");
      }
    } catch (err) {
      setError("トークンの検証に失敗しました");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上である必要があります");
      return;
    }

    if (!token) {
      setError("リセットトークンが指定されていません");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "パスワードのリセットに失敗しました");
      } else {
        setSuccess(true);
        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      }
    } catch (err) {
      setError("パスワードのリセットに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">トークンを検証中...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-6 text-emerald-400">
            パスワードをリセットしました
          </h1>
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-200 text-sm">
            <p className="mb-2">
              パスワードが正常にリセットされました。
            </p>
            <p className="text-xs text-emerald-300 mt-4">
              3秒後にログインページにリダイレクトします...
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors text-center"
          >
            ログインページに移動
          </Link>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-6 text-red-400">
            エラー
          </h1>
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
            <p>{error}</p>
          </div>
          <Link
            href="/auth/reset"
            className="block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors text-center"
          >
            パスワードリセットページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-100">
          新しいパスワードを設定
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              新しいパスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="6文字以上"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="パスワードを再入力"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {loading ? "リセット中..." : "パスワードをリセット"}
          </button>
        </form>

        <div className="mt-6 text-center">
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

