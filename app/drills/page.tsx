// app/drills/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type DrillListItem = {
  id: string;
  title: string;
  dataName: string;
  createdAt: string;
  updatedAt: string;
  setsCount: number;
  membersCount: number;
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
  userRole: string | null;
};

export default function DrillsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [drills, setDrills] = useState<DrillListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 認証チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDrills();
    }
  }, [status]);

  const fetchDrills = async () => {
    try {
      setLoading(true);
      console.log("Fetching drills from /api/drills...");
      
      const response = await fetch("/api/drills");
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      });
      
      // Content-Typeを確認
      const contentType = response.headers.get("content-type");
      const isJSON = contentType && contentType.includes("application/json");
      
      if (!response.ok) {
        // 401エラーの場合はログインページにリダイレクト
        if (response.status === 401) {
          router.push("/auth/signin");
          return;
        }
        
        let errorData: any = {};
        let responseText = "";
        
        try {
          responseText = await response.text();
          console.log("Error response text length:", responseText.length);
          console.log("Error response text (first 500 chars):", responseText.substring(0, 500));
          console.log("Is JSON:", isJSON);
          
          if (responseText.trim() === "") {
            // 空のレスポンスの場合
            errorData = { 
              error: `空のレスポンス (HTTP ${response.status})`,
              message: "サーバーがエラーレスポンスを返していません。サーバーログを確認してください。"
            };
          } else if (responseText.startsWith("<!DOCTYPE")) {
            // HTMLレスポンスの場合（404エラーページなど）
            errorData = { 
              error: `APIエンドポイントが見つかりません (HTTP ${response.status})`,
              message: "APIルートが正しく設定されていない可能性があります。"
            };
          } else if (isJSON) {
            try {
              errorData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error("JSON parse error:", jsonError);
              errorData = { 
                error: `JSON解析エラー (HTTP ${response.status})`,
                message: responseText.substring(0, 200)
              };
            }
          } else {
            errorData = { 
              error: `HTTP ${response.status}: ${response.statusText}`,
              message: responseText.substring(0, 200) || "不明なエラー"
            };
          }
        } catch (parseError) {
          console.error("Failed to read error response:", parseError);
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: "レスポンスの読み取りに失敗しました"
          };
        }
        
        console.error("API Error Data:", JSON.stringify(errorData, null, 2));
        
        // Prismaエラーの場合、より詳細なメッセージを表示
        if (errorData.prismaError) {
          if (errorData.prismaError.code === 'P2021') {
            throw new Error("データベーステーブルが存在しません。マイグレーションを実行してください。");
          } else if (errorData.prismaError.code === 'P1001') {
            throw new Error("データベースに接続できません。DATABASE_URLを確認してください。");
          }
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: Failed to fetch drills`);
      }
      
      if (!isJSON) {
        const text = await response.text();
        console.error("Expected JSON but got:", text.substring(0, 200));
        throw new Error("APIレスポンスがJSON形式ではありません");
      }
      
      const data = await response.json();
      console.log("Drills data received:", data);
      setDrills(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching drills:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title || "無題"}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/drills/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete drill");
      }

      // 一覧を更新
      fetchDrills();
    } catch (err) {
      console.error("Error deleting drill:", err);
      alert("削除に失敗しました");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              ドリル一覧
            </h1>
            <Link
              href="/drill"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ＋ 新規作成
            </Link>
          </div>
          <p className="text-slate-400">
            保存されたドリルデータの一覧です。クリックして編集できます。
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200">
            <p>エラー: {error}</p>
          </div>
        )}

        {/* ローディング */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">読み込み中...</p>
          </div>
        ) : drills.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-slate-700/50 bg-slate-800/30">
            <p className="text-slate-400 text-lg mb-4">保存されたドリルがありません</p>
            <Link
              href="/drill"
              className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium transition-all duration-200"
            >
              新規ドリルを作成
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drills.map((drill) => (
              <div
                key={drill.id}
                className="rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-6 hover:border-emerald-500/50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="text-xl font-semibold text-slate-200">
                      {drill.title || "無題"}
                    </h2>
                    {!drill.isOwner && (
                      <span className="px-2 py-1 rounded bg-blue-900/40 border border-blue-500/60 text-blue-200 text-xs whitespace-nowrap">
                        {drill.userRole === "editor" ? "編集者" : "閲覧者"}
                      </span>
                    )}
                  </div>
                  {drill.dataName && (
                    <p className="text-sm text-slate-400 mb-1">{drill.dataName}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    作成者: {drill.ownerName}
                  </p>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-emerald-900/40 border border-emerald-500/60 text-emerald-200 text-xs">
                      {drill.setsCount} セット
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                      {drill.membersCount} メンバー
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    更新: {formatDate(drill.updatedAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/drill?id=${drill.id}`}
                    className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium transition-all duration-200 text-center"
                  >
                    開く
                  </Link>
                  <button
                    onClick={() => handleDelete(drill.id, drill.title)}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium transition-all duration-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

