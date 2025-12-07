// app/help/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<"features" | "faq" | "tutorials">("features");

  const features = [
    {
      title: "ドリルエディタ",
      description: "フィールド上でメンバーを配置し、フォーメーションをデザインします。",
      items: [
        "ドラッグ&ドロップでメンバーを配置",
        "複数選択・一括操作",
        "円・横一列・ボックスなどの整列機能",
        "回転・拡大縮小",
      ],
    },
    {
      title: "タイムライン",
      description: "カウントを管理し、SET（セット）を作成します。",
      items: [
        "カウントのシーク（ドラッグで移動）",
        "SETマーカーの追加/削除（ダブルクリック）",
        "再生RANGEの設定",
        "再生・停止・ループ",
      ],
    },
    {
      title: "メンバー管理",
      description: "メンバーを追加・編集・削除します。",
      items: [
        "個別追加・一括追加",
        "パート（楽器）の設定",
        "色の設定",
        "フィルター機能",
      ],
    },
    {
      title: "エクスポート",
      description: "ドリルデータを様々な形式で出力します。",
      items: [
        "JSON / YAML形式でのエクスポート",
        "PDF形式でのエクスポート",
        "画像形式でのエクスポート",
        "印刷プレビュー",
      ],
    },
    {
      title: "3Dプレビュー",
      description: "3Dでドリルを視覚化します。",
      items: [
        "3D表示での確認",
        "複数の視点からの確認",
        "録画機能",
      ],
    },
  ];

  const faqs = [
    {
      question: "SET（セット）とは何ですか？",
      answer: "SETは、特定のカウントでのフォーメーションのスナップショットです。2つのSETの間が、その区間の動きの長さになります。",
    },
    {
      question: "メンバーを移動するには？",
      answer: "フィールド上のメンバーをクリックして選択し、ドラッグして移動できます。複数選択するには、Shiftキーを押しながらクリックするか、矩形選択を使用します。",
    },
    {
      question: "データはどこに保存されますか？",
      answer: "ローカルストレージ（ブラウザ）に保存されます。ログインしている場合は、データベースにも保存できます。",
    },
    {
      question: "エクスポートしたデータを別のPCで使えますか？",
      answer: "はい、JSONまたはYAML形式でエクスポートしたデータを、別のPCでインポートできます。",
    },
    {
      question: "複数のユーザーで共同編集できますか？",
      answer: "はい、マルチユーザー対応機能により、複数のユーザーでリアルタイムに共同編集できます。",
    },
  ];

  const tutorials = [
    {
      title: "基本的な使い方",
      description: "ドリルエディタの基本的な操作を学びます。",
      videoUrl: "#", // 実際の動画URLに置き換え
      duration: "5分",
    },
    {
      title: "SETの作成と管理",
      description: "SETマーカーの作成・削除・編集方法を説明します。",
      videoUrl: "#",
      duration: "3分",
    },
    {
      title: "メンバーの配置と整列",
      description: "メンバーの配置方法と整列機能の使い方を説明します。",
      videoUrl: "#",
      duration: "4分",
    },
    {
      title: "エクスポートと印刷",
      description: "ドリルデータのエクスポートと印刷方法を説明します。",
      videoUrl: "#",
      duration: "3分",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ヘルプ・ドキュメント</h1>
          <p className="text-slate-400">
            ドリルデザインWebサービスの使い方と機能説明
          </p>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("features")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "features"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            機能一覧
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "faq"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            よくある質問
          </button>
          <button
            onClick={() => setActiveTab("tutorials")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "tutorials"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            動画チュートリアル
          </button>
        </div>

        {/* コンテンツ */}
        <div className="space-y-6">
          {activeTab === "features" && (
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/50 p-6"
                >
                  <h2 className="text-xl font-semibold mb-2 text-slate-200">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex items-start text-sm text-slate-300"
                      >
                        <span className="text-emerald-400 mr-2">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/50 p-6"
                >
                  <h3 className="text-lg font-semibold mb-2 text-slate-200">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "tutorials" && (
            <div className="space-y-4">
              {tutorials.map((tutorial, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/50 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-slate-200">
                        {tutorial.title}
                      </h3>
                      <p className="text-sm text-slate-300 mb-3">
                        {tutorial.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">
                          動画時間: {tutorial.duration}
                        </span>
                        <a
                          href={tutorial.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          動画を見る →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-slate-700 text-center text-sm text-slate-400">
          <p>
            さらに詳しい情報が必要な場合は、{" "}
            <Link href="/drill" className="text-emerald-400 hover:text-emerald-300">
              ドリルエディタ
            </Link>
            のヘルプダイアログもご覧ください。
          </p>
        </div>
      </div>
    </div>
  );
}

