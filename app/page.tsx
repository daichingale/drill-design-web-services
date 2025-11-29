// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* タイトル＋説明 */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Drill Design Web
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          マーチングドリル デザインWEBツール
          <span className="ml-1 text-sm text-slate-400">（プロトタイプ）</span>
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          ブラウザ上でフォーメーションを設計・再生できる
          ドリルデザインツールです。PCブラウザさえあればどこでも編集・確認できます。
        </p>
      </section>

      {/* メイン操作ボタン */}
      <section className="flex flex-wrap items-center gap-3">
        <Link
          href="/drill"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
        >
          ドリルエディタを開く
        </Link>
        <Link
          href="/members"
          className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700/90 transition-colors"
        >
          メンバー管理へ
        </Link>
        <span className="text-[11px] text-slate-400">
          ※ データ保存機能は今後実装予定
        </span>
      </section>

      {/* 機能紹介カード */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
            Current Features
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>・フィールド上でのドット配置＆移動</li>
            <li>・Set ごとのフォーメーション管理</li>
            <li>・タイムラインによるカウント再生</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
            Roadmap
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>・JSON / クラウドへの保存と読み込み</li>
            <li>・Undo / Redo の安定化</li>
            <li>・セット注釈やマーカー機能の追加</li>
          </ul>
        </div>
      </section>

      {/* ToDo メモ */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Todo Notes
        </h2>
        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
          <li>フィールド上での直感的なドラッグ操作</li>
          <li>セット間のコピー／ペースト</li>
          <li>出力（PDF / 画像）まわりの設計</li>
        </ul>
      </section>
    </div>
  );
}
