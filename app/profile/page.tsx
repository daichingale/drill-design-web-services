// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchProfile();
    }
  }, [status, session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/signin");
          return;
        }
        throw new Error("プロフィールの取得に失敗しました");
      }
      const data = await response.json();
      setProfile(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/signin");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "プロフィールの更新に失敗しました");
      }

      const data = await response.json();
      setProfile(data);
      setSuccess("プロフィールを更新しました");
      await fetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("新しいパスワードは6文字以上である必要があります");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/signin");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "パスワードの変更に失敗しました");
      }

      setSuccess("パスワードを変更しました");
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error changing password:", err);
      setError(err instanceof Error ? err.message : "パスワードの変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              マイページ
            </h1>
            <Link
              href="/drill"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-medium transition-all duration-200"
            >
              ドリルエディタに戻る
            </Link>
          </div>
          <p className="text-slate-400">会員情報の確認と変更ができます。</p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-900/40 border border-emerald-500/50 text-emerald-200">
            <p>{success}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* プロフィール情報 */}
          <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">プロフィール情報</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                  表示名
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="表示名を入力"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500">メールアドレスは変更できません</p>
              </div>
              {profile && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    登録日: {new Date(profile.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="text-xs text-slate-400">
                    最終更新: {new Date(profile.updatedAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-all duration-200"
              >
                {saving ? "保存中..." : "プロフィールを更新"}
              </button>
            </form>
          </div>

          {/* パスワード変更 */}
          <div className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">パスワード変更</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300 mb-1">
                  現在のパスワード
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="現在のパスワードを入力"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">
                  新しいパスワード
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="新しいパスワードを入力（6文字以上）"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="新しいパスワードを再入力"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-all duration-200"
              >
                {saving ? "変更中..." : "パスワードを変更"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


