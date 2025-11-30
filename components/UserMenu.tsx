// components/UserMenu.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/signin");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/signin"
          className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 rounded transition-colors"
        >
          ログイン
        </Link>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const displayName = user.name || user.email || "ユーザー";

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-slate-700/30 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-semibold text-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100 max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isMenuOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm shadow-xl z-20 overflow-hidden">
            <div className="p-2">
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>マイページ</span>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>🚪</span>
                  <span>ログアウト</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

