// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* ヒーローセクション */}
      <section className="space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            Drill Design Web
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium">
            ブラウザでマーチングドリルを
            <br className="md:hidden" />
            デザイン・編集・再生
          </p>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Pywareライクなドリルデザインツールをブラウザで。PCさえあればどこでも編集・確認できます。
            <br />
            フィールド上で直感的にフォーメーションを設計し、リアルタイムで再生・確認できます。
          </p>
        </div>

        {/* CTAボタン - 大きく目立つ */}
        <div className="flex items-center justify-center pt-12 pb-8">
          <div className="relative group">
            {/* 外側の光るエフェクト */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 opacity-60 blur-2xl group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>
            
            {/* メインボタン */}
            <div className="relative rounded-3xl border-4 border-emerald-400/80 bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 p-2 shadow-2xl shadow-emerald-500/50 group-hover:shadow-emerald-500/70 transition-all duration-300">
              <Link
                href="/drill"
                className="block rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 px-16 py-8 md:px-24 md:py-10 text-2xl md:text-3xl font-extrabold text-slate-950 shadow-inner hover:from-emerald-300 hover:to-emerald-400 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-5">
                  <span className="text-4xl md:text-5xl animate-bounce">🚀</span>
                  <span className="tracking-wide">ドリルエディタを開く</span>
                  <span className="text-3xl md:text-4xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
        
        {/* サブテキスト */}
        <div className="text-center space-y-2">
          <p className="text-lg md:text-xl font-semibold text-emerald-400 animate-pulse">
            まずはドリルエディタで触ってみてください！
          </p>
          <p className="text-sm text-slate-500">
            クリックしてすぐに始められます
          </p>
        </div>
      </section>

      {/* 主な機能紹介 */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-slate-200">
          主な機能
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* カード1: ドリルエディタ */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              直感的なドリルエディタ
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>フィールド上でドラッグ&ドロップで配置</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>複数選択・一括操作対応</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>スナップモード（ホール/ハーフ/自由）</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>ベジェアーク・直線整列機能</span>
              </li>
            </ul>
          </div>

          {/* カード2: 再生・プレビュー */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="text-4xl mb-4">▶️</div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              リアルタイム再生
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>タイムラインでカウント再生</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>3Dプレビュー対応</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>音楽同期機能（開発中）</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>2D/3D録画機能</span>
              </li>
            </ul>
          </div>

          {/* カード3: エクスポート */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="text-4xl mb-4">📤</div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              豊富なエクスポート
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>PNG/JPEG画像エクスポート</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>PDF形式での出力</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>JSON/YAML形式での保存</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">✓</span>
                <span>印刷機能</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ワークフロー */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-slate-200">
          使い方
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto">
              1
            </div>
            <h3 className="font-semibold text-slate-200">メンバー登録</h3>
            <p className="text-sm text-slate-400">
              メンバー管理ページで楽器パートや色を設定
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto">
              2
            </div>
            <h3 className="font-semibold text-slate-200">フォーメーション作成</h3>
            <p className="text-sm text-slate-400">
              ドリルエディタでフィールド上に配置
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto">
              3
            </div>
            <h3 className="font-semibold text-slate-200">再生・確認</h3>
            <p className="text-sm text-slate-400">
              タイムラインで再生して動作を確認
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto">
              4
            </div>
            <h3 className="font-semibold text-slate-200">エクスポート</h3>
            <p className="text-sm text-slate-400">
              画像やPDFとして出力・共有
            </p>
          </div>
        </div>
      </section>

      {/* 技術スタック */}
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold text-slate-200">
          ブラウザで完結
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          インストール不要。Next.jsとReactで構築されたモダンなWebアプリケーションです。
          <br />
          データはローカルストレージに保存され、JSON/YAML形式でのエクスポートも可能です。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
          <span className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700">
            Next.js
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700">
            React
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700">
            TypeScript
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700">
            Tailwind CSS
          </span>
        </div>
      </section>
    </div>
  );
}
