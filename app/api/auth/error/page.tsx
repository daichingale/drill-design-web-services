// app/api/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "認証の設定に問題があります。",
    AccessDenied: "アクセスが拒否されました。",
    Verification: "認証トークンの検証に失敗しました。",
    Default: "認証中にエラーが発生しました。",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-red-400">
          認証エラー
        </h1>
        
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200">
          <p className="text-center">{errorMessage}</p>
          {error && (
            <p className="text-center text-sm mt-2 text-red-300">
              エラーコード: {error}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors text-center"
          >
            ログインページに戻る
          </Link>
          <Link
            href="/auth/signup"
            className="block w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition-colors text-center"
          >
            新規登録ページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

