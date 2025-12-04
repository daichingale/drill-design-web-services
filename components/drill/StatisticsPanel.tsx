// components/drill/StatisticsPanel.tsx
"use client";

import { useMemo } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { useSettings } from "@/context/SettingsContext";
import {
  calculateMovementDistance,
  calculateMovementSpeed,
  calculateFormationComplexity,
  calculateCollisionRisk,
} from "@/lib/drill/statistics";

type StatisticsPanelProps = {
  sets: UiSet[];
  members: Member[];
  playbackBPM: number;
};

export default function StatisticsPanel({
  sets,
  members,
  playbackBPM,
}: StatisticsPanelProps) {
  const { formatDisplayValue } = useSettings();

  const stats = useMemo(() => {
    if (sets.length === 0 || members.length === 0) {
      return null;
    }

    const movement = calculateMovementDistance(sets, members);
    const speed = calculateMovementSpeed(sets, members, playbackBPM);
    const complexity = calculateFormationComplexity(sets, members);
    const collision = calculateCollisionRisk(sets, members);

    return {
      movement,
      speed,
      complexity,
      collision,
    };
  }, [sets, members, playbackBPM]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-slate-300">
            統計・分析
          </h2>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            開発中
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          セットまたはメンバーが設定されていません
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-slate-300">
          統計・分析
        </h2>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          開発中
        </span>
      </div>

      <div className="space-y-3">
        {/* 移動距離 */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-medium text-slate-200">
            移動距離
          </h3>
          <div className="space-y-1 text-[10px] text-slate-300">
            <div className="flex justify-between">
              <span>合計:</span>
              <span className="font-medium">
                {formatDisplayValue(stats.movement.totalDistance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>平均:</span>
              <span>{formatDisplayValue(stats.movement.averageDistance)}</span>
            </div>
            <div className="flex justify-between">
              <span>最大:</span>
              <span className="text-yellow-400">
                {formatDisplayValue(stats.movement.maxDistance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>最小:</span>
              <span>{formatDisplayValue(stats.movement.minDistance)}</span>
            </div>
          </div>
        </div>

        {/* 移動速度 */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-medium text-slate-200">
            移動速度
          </h3>
          <div className="space-y-1 text-[10px] text-slate-300">
            <div className="flex justify-between">
              <span>平均速度:</span>
              <span>{stats.speed.averageSpeed.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span>最大速度:</span>
              <span className="text-yellow-400">
                {stats.speed.maxSpeed.toFixed(2)} m/s
              </span>
            </div>
          </div>
        </div>

        {/* 複雑度スコア */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-medium text-slate-200">
            フォーメーション複雑度
          </h3>
          <div className="space-y-1 text-[10px] text-slate-300">
            <div className="flex justify-between items-center">
              <span>複雑度スコア:</span>
              <span className="font-medium text-lg">
                {stats.complexity.complexityScore}
              </span>
            </div>
            <div className="flex justify-between">
              <span>密度:</span>
              <span>{formatDisplayValue(stats.complexity.densityScore)}</span>
            </div>
            <div className="flex justify-between">
              <span>移動複雑度:</span>
              <span>{stats.complexity.movementComplexity.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 衝突リスク */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-medium text-slate-200">
            衝突リスク
          </h3>
          <div className="space-y-1 text-[10px] text-slate-300">
            <div className="flex justify-between">
              <span>リスク箇所:</span>
              <span
                className={
                  stats.collision.riskCount > 0
                    ? "text-red-400 font-medium"
                    : "text-green-400"
                }
              >
                {stats.collision.riskCount}箇所
              </span>
            </div>
            {stats.collision.highRiskPairs.length > 0 && (
              <div className="mt-1.5 space-y-0.5 max-h-24 overflow-y-auto">
                {stats.collision.highRiskPairs.slice(0, 5).map((pair, idx) => (
                  <div
                    key={idx}
                    className="text-[9px] text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded"
                  >
                    {pair.member1} ↔ {pair.member2} (
                    {formatDisplayValue(pair.distance)}, Count: {pair.setCount})
                  </div>
                ))}
                {stats.collision.highRiskPairs.length > 5 && (
                  <div className="text-[9px] text-slate-500">
                    +{stats.collision.highRiskPairs.length - 5}件
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

