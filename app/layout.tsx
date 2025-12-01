// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MembersProvider } from "@/context/MembersContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { MenuProvider } from "@/context/MenuContext";
import { I18nProvider } from "@/context/I18nContext";
import { ClipboardProvider } from "@/context/ClipboardContext";
import { ShortcutProvider } from "@/context/ShortcutContext";
import MenuBar from "@/components/MenuBar";
import HeaderControls from "@/components/HeaderControls";
import ErrorNotification from "@/components/ErrorNotification";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Drill Design Web Services",
  description: "ブラウザでマーチングドリルを作成するツール（プロトタイプ）",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        {/* 全体で共有するコンテキスト */}
        <SessionProvider>
          <I18nProvider>
            <SettingsProvider>
              <ShortcutProvider>
                <ClipboardProvider>
                  <MembersProvider>
                    <MenuProvider>
                  {/* メニューバー（固定、最上部） */}
                  <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur rounded-b-lg">
                <div className="mx-auto max-w-full">
                  {/* メニューバー */}
                  <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700/30 transition-colors group"
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                          DD
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-slate-200 group-hover:text-slate-100 transition-colors">
                          Drill Design Web
                        </span>
                      </Link>
                      <MenuBar />
                    </div>
                    <HeaderControls />
                  </div>
                </div>
              </div>

                {/* 各ページ本体 */}
                <main className="mx-auto max-w-[98vw] px-2 py-4">{children}</main>
                {/* エラー通知 */}
                <ErrorNotification />
                    </MenuProvider>
                  </MembersProvider>
                </ClipboardProvider>
              </ShortcutProvider>
            </SettingsProvider>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
