// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">
        マーチングドリル デザインWEBツール（仮）
      </h1>
      <p className="text-gray-700">
        ブラウザ上でドットを動かしてフォーメーションを作るための、
        団長専用ドリル作成ツールのプロトタイプです。
      </p>

      <div className="flex gap-3">
        <Link
          href="/drill"
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          ドリルエディタを開く
        </Link>
        <Link
          href="/members"
          className="px-4 py-2 rounded border text-sm"
        >
          メンバー管理へ
        </Link>
      </div>

      <section className="mt-4">
        <h2 className="font-semibold mb-2">今後やりたいこと（メモ）</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>フィールド上でドットをドラッグ＆ドロップで配置</li>
          <li>セットごとのフォーメーション管理</li>
          <li>カウントごとのアニメーション再生</li>
          <li>JSON / クラウドへの保存と読み込み</li>
        </ul>
      </section>
    </div>
  );
}
