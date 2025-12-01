"use client";

import React from "react";

type EditorHelpDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function EditorHelpDialog({ open, onClose }: EditorHelpDialogProps) {
  if (!open) return null;

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <div className="text-xs text-slate-300 space-y-1">{children}</div>
    </section>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] rounded-xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/80 bg-slate-800/60">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              ドリルエディタの使い方
            </h2>
            <p className="text-[11px] text-slate-400">
              セットの作り方・メンバー追加・保存 / エクスポート・タイムライン操作の概要
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm rounded-md bg-slate-700/60 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-500/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[13px] leading-relaxed">
          <Section title="SET（セット）の作り方">
            <ul className="list-disc list-inside space-y-1">
              <li>
                タイムライン上でシークバーを動かし、
                <span className="font-mono text-emerald-300">その位置をダブルクリック</span>
                すると、そのカウントに SET マーカーを作成できます。
              </li>
              <li>
                SET は「このカウントでこういう形になっている」という
                <span className="font-semibold">スナップショット（点）</span>
                です。2つの SET の間が、その区間の動きの長さになります。
              </li>
              <li>
                SET マーカーは、同じ位置をもう一度ダブルクリックするか、
                タイムライン右上の
                <span className="font-mono text-red-300">「SETマーカー解除」</span>
                ボタンで削除できます（現在のカウントに SET がある場合のみ有効）。
              </li>
            </ul>
          </Section>

          <Section title="メンバーの追加と配置">
            <ul className="list-disc list-inside space-y-1">
              <li>
                右サイドの
                <span className="font-mono text-emerald-300">「メンバー管理」</span>
                タブから
                <span className="font-mono">「＋ 追加」</span>
                で 1 人ずつ、
                <span className="font-mono">「＋ 一括」</span>
                でまとめてメンバーを追加できます。
              </li>
              <li>
                設定画面の
                <span className="font-mono text-emerald-300">「メンバー追加モード」</span>
                で
                <span className="font-semibold">サクサク追加モード</span>
                （自動配置）と
                <span className="font-semibold">じっくり追加モード</span>
                （あとで自分で配置）を切り替えられます。
              </li>
              <li>
                メンバーを選択した状態で、左の
                <span className="font-mono text-emerald-300">SET操作 / 整列・変形</span>
                から円・横一列・ボックスなどのフォーメーションを適用できます。
              </li>
            </ul>
          </Section>

          <Section title="保存の仕方">
            <ul className="list-disc list-inside space-y-1">
              <li>
                画面上部のメニューバー「ファイル」から
                <span className="font-mono text-emerald-300">「保存（ローカル）」</span>
                を選ぶと、ブラウザのローカルストレージに保存されます（
                <span className="font-mono">Ctrl+S</span>
                でもOK）。
              </li>
              <li>
                ログイン済みの場合は
                <span className="font-mono text-emerald-300">「データベースに保存」</span>
                でサーバー側にも保存できます（
                <span className="font-mono">Ctrl+Shift+S</span>
                ）。
              </li>
              <li>
                「読み込み」から既存ドリルを開いたり、「ドリル一覧」で過去のドリルに戻ることができます。
              </li>
            </ul>
          </Section>

          <Section title="エクスポートと出力形式">
            <ul className="list-disc list-inside space-y-1">
              <li>
                「ファイル」メニューの
                <span className="font-mono">JSON形式でエクスポート / YAML形式でエクスポート</span>
                から、ドリルデータをファイルとして書き出せます。
              </li>
              <li>
                エクスポートオプションでは、今後 PDF や画像、動画など
                <span className="font-semibold">印刷・共有向けの形式</span>
                も選べるように拡張していきます。
              </li>
              <li>
                エクスポートしたファイルは、別環境への持ち運びやバックアップとして利用できます。
              </li>
            </ul>
          </Section>

          <Section title="タイムラインの操作（カウント / RANGE / 再生）">
            <ul className="list-disc list-inside space-y-1">
              <li>
                グレーのバーをクリック＆ドラッグすると、シークバー（白い線）が動き、
                <span className="font-semibold">現在のカウント</span>
                を変更できます。
              </li>
              <li>
                青紫の帯が
                <span className="font-semibold">再生 RANGE</span>
                です。両端の小さなハンドルをドラッグして開始 / 終了カウントを調整できます。
              </li>
              <li>
                タイムラインにフォーカスしているとき：
                <span className="font-mono">Space</span>
                で再生 / 停止、矢印キーでカウント移動、
                <span className="font-mono">Ctrl+← / Ctrl+→</span>
                で SET マーカー間をジャンプできます。
              </li>
              <li>
                タイムラインをダブルクリックすると、そのカウントに SET マーカーを追加 / 削除できます。
              </li>
            </ul>
          </Section>
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-slate-700/80 text-[11px] text-slate-400 flex justify-between items-center">
          <span>このダイアログはいつでも閉じて再度開くことができます。</span>
          <span>今後、図解付きの詳細ヘルプも追加予定です。</span>
        </div>
      </div>
    </div>
  );
}


