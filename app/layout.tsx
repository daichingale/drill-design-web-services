// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MembersProvider } from "@/context/MembersContext";
import { SettingsProvider } from "@/context/SettingsContext";

export const metadata: Metadata = {
  title: "Drill Design Web Services",
  description: "ブラウザでマーチングドリルを作成するツール（プロトタイプ）",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        {/* 全体で共有するコンテキスト */}
        <SettingsProvider>
          <MembersProvider>
          {/* 上部ヘッダー */}
          <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
            <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold text-base tracking-tight">
                Drill Design Web
              </Link>
              <nav className="flex gap-4 text-xs text-slate-300">
                <Link
                  href="/drill"
                  className="hover:text-emerald-300 transition-colors"
                >
                  ドリルエディタ
                </Link>
                <Link
                  href="/members"
                  className="hover:text-emerald-300 transition-colors"
                >
                  メンバー管理
                </Link>
                <Link
                  href="/settings"
                  className="hover:text-emerald-300 transition-colors"
                >
                  設定
                </Link>
              </nav>
            </div>
          </header>

          {/* 各ページ本体 */}
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </MembersProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
