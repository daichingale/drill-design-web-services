"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BackToDrillButton from "@/components/BackToDrillButton";
import MusicAnalysisPanel from "@/components/drill/MusicAnalysisPanel";
import LearningPanel from "@/components/drill/LearningPanel";
import { useMusicSync } from "@/hooks/useMusicSync";
import { useSettings } from "@/context/SettingsContext";
import { addGlobalNotification } from "@/components/ErrorNotification";

function BetaFeaturesPageInner() {
  const searchParams = useSearchParams();
  const drillId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState<string>("ai");

  const tabs = [
    { id: "ai", label: "AI機能", icon: "🤖" },
    { id: "experimental", label: "実験的機能", icon: "🔬" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              ベータ機能
            </h1>
            <BackToDrillButton />
          </div>
          <p className="text-slate-400">
            開発中の機能を試すことができます。これらの機能は実験的なもので、予告なく変更・削除される可能性があります。
          </p>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="space-y-6">
          {activeTab === "ai" && <AIFeaturesSection drillId={drillId} />}
          {activeTab === "experimental" && <ExperimentalFeaturesSection drillId={drillId} />}
        </div>
      </div>
    </div>
  );
}

/**
 * AI機能セクション
 */
function AIFeaturesSection({ drillId }: { drillId: string | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🤖</span>
          <span>AI機能</span>
        </h2>
        <p className="text-slate-400 mb-6">
          AIを活用したドリルデザイン支援機能です。フォーメーションの自動生成や最適化提案などを行います。
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* フォーメーション自動生成 */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">✨</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">フォーメーション自動生成</h3>
                <p className="text-slate-400 text-sm mb-4">
                  メンバー数やパート構成から最適なフォーメーションを自動生成します。
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <p className="mb-2">対応機能:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>指定形状への自動配置（円形、直線、V字など）</li>
                  <li>対称性を考慮した配置</li>
                  <li>移動距離を最小化する配置</li>
                </ul>
              </div>
              <button
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  // TODO: フォーメーション自動生成モーダルを開く
                  alert("この機能は開発中です。");
                }}
              >
                フォーメーションを生成
              </button>
            </div>
          </div>

          {/* スマートトランジション提案 */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">🔄</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">スマートトランジション提案</h3>
                <p className="text-slate-400 text-sm mb-4">
                  現在のフォーメーションから次のフォーメーションへの最適な移動経路を提案します。
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <p className="mb-2">対応機能:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>衝突を避けた自動パス生成</li>
                  <li>移動距離・時間を考慮した最適化</li>
                  <li>複数の移動パターンから選択</li>
                </ul>
              </div>
              <button
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  // TODO: トランジション提案モーダルを開く
                  alert("この機能は開発中です。");
                }}
              >
                トランジションを提案
              </button>
            </div>
          </div>

          {/* フォーメーション最適化 */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">フォーメーション最適化</h3>
                <p className="text-slate-400 text-sm mb-4">
                  既存のフォーメーションを分析し、より良い配置を提案します。
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <p className="mb-2">対応機能:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>バランスの改善提案</li>
                  <li>視覚的インパクトの向上</li>
                  <li>移動距離の最適化</li>
                </ul>
              </div>
              <button
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  // TODO: 最適化モーダルを開く
                  alert("この機能は開発中です。");
                }}
              >
                最適化を実行
              </button>
            </div>
          </div>

          {/* AIアシスタント */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">💬</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AIアシスタント</h3>
                <p className="text-slate-400 text-sm mb-4">
                  自然言語でドリルデザインに関する質問や提案を受け付けます。
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <p className="mb-2">対応機能:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>フォーメーションの提案</li>
                  <li>デザインの改善アドバイス</li>
                  <li>質問への回答</li>
                </ul>
              </div>
              <button
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  // TODO: AIアシスタントチャットを開く
                  alert("この機能は開発中です。");
                }}
              >
                AIアシスタントを開く
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 実験的機能セクション
 */
function ExperimentalFeaturesSection({ drillId }: { drillId: string | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🔬</span>
          <span>実験的機能</span>
        </h2>
        <p className="text-slate-400 mb-6">
          非常に実験的な機能です。動作が不安定な場合があります。
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* プレースホルダー */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-2">今後追加予定</h3>
            <p className="text-slate-400 text-sm">
              実験的な機能は今後追加される予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BetaFeaturesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    }>
      <BetaFeaturesPageInner />
    </Suspense>
  );
}
