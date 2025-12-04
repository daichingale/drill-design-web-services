// components/drill/LearningPanel.tsx
"use client";

import { useState, useEffect } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";

type Props = {
  sets: UiSet[];
  members: Member[];
  drillTitle?: string;
  onSaveDrill?: () => void;
  onSuggestPattern?: (section: "intro" | "verse" | "chorus" | "bridge" | "outro") => void;
};

type LearnedPatterns = {
  patterns: Array<{
    id: string;
    type: string;
    frequency: number;
    preferredSections: string[];
  }>;
  sectionPreferences: Record<string, {
    count: number;
    avgMovementDistance: number;
    preferredFormations: Record<string, number>;
  }>;
  statistics: {
    totalDrills: number;
    totalSets: number;
    avgSetsPerDrill: number;
    mostUsedFormation: string | null;
    mostUsedTransition: string | null;
  };
};

export default function LearningPanel({
  sets,
  members,
  drillTitle,
  onSaveDrill,
  onSuggestPattern,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPatterns | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 学習済みパターンを読み込み
  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/learning/patterns");
      if (response.ok) {
        const data = await response.json();
        setLearnedPatterns(data);
      }
    } catch (err) {
      console.error("パターン読み込みエラー:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDrill = async () => {
    if (sets.length === 0) {
      alert("セットがありません。ドリルを作成してから保存してください。");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // ドリルデータを構築
      const drillData = {
        drillId: `drill-${Date.now()}`,
        title: drillTitle || "無題のドリル",
        metadata: {
          createdAt: new Date().toISOString(),
          totalCounts: Math.max(...sets.map(s => s.startCount), 0),
        },
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          part: m.part,
        })),
        sets: sets.map(set => ({
          id: set.id,
          startCount: set.startCount,
          endCount: undefined, // 次のセットのstartCount
          section: null, // 後で音楽分析から取得
          positions: set.positions,
        })),
      };

      const response = await fetch("/api/learning/save-drill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(drillData),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      const result = await response.json();
      setSaveMessage(result.message || "ドリルを学習データとして保存しました");
      
      // パターンを再読み込み
      await loadPatterns();

      if (onSaveDrill) {
        onSaveDrill();
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "保存エラー");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        <div className="flex items-center gap-2">
          <span>学習・提案</span>
          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-yellow-900/40 text-yellow-300 rounded border border-yellow-700/50">
            BETA
          </span>
        </div>
      </h2>

      {/* 学習ボタン */}
      <div className="space-y-2">
        <button
          onClick={handleSaveDrill}
          disabled={isSaving || sets.length === 0}
          className={`w-full px-3 py-2 text-xs rounded transition-colors ${
            isSaving || sets.length === 0
              ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
              : "bg-blue-600/80 hover:bg-blue-600 text-white"
          }`}
        >
          {isSaving ? "保存中..." : "このドリルを学習に追加"}
        </button>
        {saveMessage && (
          <p className={`text-xs ${saveMessage.includes("エラー") ? "text-red-400" : "text-emerald-400"}`}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* 統計情報 */}
      {learnedPatterns && learnedPatterns.statistics.totalDrills > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            学習統計
          </h3>
          <div className="p-2 bg-slate-900/50 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">保存済みドリル:</span>
              <span className="text-slate-200">{learnedPatterns.statistics.totalDrills}本</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">総セット数:</span>
              <span className="text-slate-200">{learnedPatterns.statistics.totalSets}個</span>
            </div>
            {learnedPatterns.statistics.mostUsedFormation && (
              <div className="flex justify-between">
                <span className="text-slate-400">よく使う隊形:</span>
                <span className="text-slate-200">{learnedPatterns.statistics.mostUsedFormation}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* セクション別提案 */}
      {onSuggestPattern && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            セクション別提案
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {(["intro", "verse", "chorus", "bridge", "outro"] as const).map((section) => (
              <button
                key={section}
                onClick={() => onSuggestPattern(section)}
                className="px-2 py-1.5 text-[10px] rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 hover:text-slate-100 transition-colors"
              >
                {section === "intro" && "序盤"}
                {section === "verse" && "Aメロ"}
                {section === "chorus" && "サビ"}
                {section === "bridge" && "間奏"}
                {section === "outro" && "終盤"}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-slate-400 text-center">読み込み中...</p>
      )}

      {learnedPatterns && learnedPatterns.statistics.totalDrills === 0 && (
        <p className="text-xs text-slate-400 text-center">
          まだ学習データがありません。
          <br />
          ドリルを作成して「学習に追加」を押してください。
        </p>
      )}
    </div>
  );
}

