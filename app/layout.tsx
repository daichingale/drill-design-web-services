// app/layout.tsx
import { MembersProvider } from "@/context/MembersContext";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css"; // Tailwind 使ってなければこの行は消してOK

export const metadata: Metadata = {
  title: "Drill Design Web Services",
  description: "ブラウザでマーチングドリルを作成するツール（プロトタイプ）",
};

export default function RootLayout({
  children}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">
        <MembersProvider>
        <header className="border-b bg-white">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-lg">
              Drill Design Web
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/drill">ドリルエディタ</Link>
              <Link href="/members">メンバー管理</Link>
              <Link href="/settings">設定</Link>
            </nav>
          </div>
        </header>
        
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </MembersProvider>
      </body>
    </html>
  );
}
