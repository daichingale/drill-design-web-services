"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * ドリルエディタに戻るボタンコンポーネント（内部実装）
 */
function BackToDrillButtonInner() {
  const searchParams = useSearchParams();
  const drillId = searchParams.get("id");

  // ドリルIDがある場合はそれを使用、ない場合は/drillに戻る
  const href = drillId ? `/drill?id=${drillId}` : "/drill";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
          clipRule="evenodd"
        />
      </svg>
      <span>ドリルエディタに戻る</span>
    </Link>
  );
}

/**
 * ドリルエディタに戻るボタンコンポーネント
 * URLパラメータから`id`を取得し、ドリルエディタに戻るリンクを表示
 * Suspenseでラップして、useSearchParamsの使用を安全にする
 */
export default function BackToDrillButton() {
  return (
    <Suspense fallback={null}>
      <BackToDrillButtonInner />
    </Suspense>
  );
}

