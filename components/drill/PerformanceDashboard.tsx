// components/drill/PerformanceDashboard.tsx
"use client";

import { useMemo } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { useSettings } from "@/context/SettingsContext";
import {
  calculateMovementDistance,
  calculateMovementSpeed,
  calculateFormationComplexity,
} from "@/lib/drill/statistics";
import {
  calculateVisualImpactScore,
} from "@/lib/drill/visualImpact";

type PerformanceDashboardProps = {
  sets: UiSet[];
  members: Member[];
  playbackBPM: number;
};

export default function PerformanceDashboard({
  sets,
  members,
  playbackBPM,
}: PerformanceDashboardProps) {
  const { settings, formatDisplayValue } = useSettings();

  const stats = useMemo(() => {
    if (sets.length === 0 || members.length === 0) {
      return null;
    }

    const movement = calculateMovementDistance(sets, members);
    const speed = calculateMovementSpeed(sets, members, playbackBPM);
    const complexity = calculateFormationComplexity(sets, members);
    const visualImpact = calculateVisualImpactScore(
      sets,
      members,
      settings.fieldWidth,
      settings.fieldHeight
    );

    return {
      movement,
      speed,
      complexity,
      visualImpact,
    };
  }, [sets, members, playbackBPM, settings.fieldWidth, settings.fieldHeight]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
        <h2 className="text-xs font-semibold text-slate-300 mb-2">
          パフォーマンス分析
        </h2>
        <p className="text-[10px] text-slate-400">
          セットまたはメンバーが設定されていません
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-4">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        パフォーマンス分析・統計ダッシュボード
      </h2>

      {/* 移動距離・速度の分析 */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-medium text-slate-200 border-b border-slate-700 pb-1">
          移動距離・速度の分析
        </h3>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">総移動距離</div>
            <div className="text-lg font-bold text-slate-200">
              {formatDisplayValue(stats.movement.totalDistance)}
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">平均移動距離</div>
            <div className="text-lg font-bold text-slate-200">
              {formatDisplayValue(stats.movement.averageDistance)}
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">最大移動距離</div>
            <div className="text-lg font-bold text-yellow-400">
              {formatDisplayValue(stats.movement.maxDistance)}
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">平均速度</div>
            <div className="text-lg font-bold text-slate-200">
              {stats.speed.averageSpeed.toFixed(2)} m/s
            </div>
          </div>
        </div>

        {/* 最も移動が多いメンバー */}
        {stats.movement.memberDistances.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400">最も移動が多いメンバー（上位5名）</div>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {stats.movement.memberDistances.slice(0, 5).map((member, idx) => (
                <div
                  key={member.memberId}
                  className="flex items-center justify-between text-[9px] bg-slate-900/50 px-2 py-1 rounded"
                >
                  <span className="text-slate-300">
                    {idx + 1}. {member.memberName}
                  </span>
                  <span className="text-yellow-400 font-medium">
                    {formatDisplayValue(member.distance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 移動距離の分布グラフ */}
        {stats.movement.distanceDistribution && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400">移動距離の分布</div>
            <div className="space-y-1">
              {stats.movement.distanceDistribution.map((dist, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="text-[9px] text-slate-400 w-16">{dist.range}</div>
                  <div className="flex-1 bg-slate-900/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 transition-all"
                      style={{
                        width: `${(dist.count / members.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-300 w-8 text-right">
                    {dist.count}人
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* セットごとの平均移動速度 */}
        {stats.speed.speedBySet.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400">セットごとの平均移動速度</div>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {stats.speed.speedBySet.slice(0, 5).map((setSpeed, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[9px] bg-slate-900/50 px-2 py-1 rounded"
                >
                  <span className="text-slate-300">Count {setSpeed.setCount}</span>
                  <span className="text-slate-200">
                    {setSpeed.averageSpeed.toFixed(2)} m/s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* フォーメーションの複雑度スコア */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-medium text-slate-200 border-b border-slate-700 pb-1">
          フォーメーションの複雑度スコア
        </h3>

        <div className="bg-slate-900/50 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400">複雑度スコア</span>
            <span className="text-2xl font-bold text-emerald-400">
              {stats.complexity.complexityScore}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${stats.complexity.complexityScore}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">密度スコア</div>
            <div className="text-sm font-medium text-slate-200">
              {formatDisplayValue(stats.complexity.densityScore)}
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded">
            <div className="text-slate-400 mb-1">移動複雑度</div>
            <div className="text-sm font-medium text-slate-200">
              {stats.complexity.movementComplexity.toFixed(1)}%
            </div>
          </div>
        </div>

        {stats.complexity.averageChange !== undefined && (
          <div className="bg-slate-900/50 p-2 rounded text-[10px]">
            <div className="text-slate-400 mb-1">セット間の平均変化量</div>
            <div className="text-sm font-medium text-slate-200">
              {formatDisplayValue(stats.complexity.averageChange)}
            </div>
          </div>
        )}

        {stats.complexity.estimatedPracticeTime !== undefined && (
          <div className="bg-blue-900/30 border border-blue-500/30 p-2 rounded text-[10px]">
            <div className="text-blue-300 mb-1">推奨練習時間の目安</div>
            <div className="text-lg font-bold text-blue-400">
              {stats.complexity.estimatedPracticeTime}分
            </div>
          </div>
        )}
      </div>

      {/* 視覚的インパクト分析 */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-medium text-slate-200 border-b border-slate-700 pb-1">
          視覚的インパクト分析
        </h3>

        <div className="bg-slate-900/50 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400">総合視覚的インパクト</span>
            <span className="text-2xl font-bold text-purple-400">
              {stats.visualImpact.overallScore}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${stats.visualImpact.overallScore}%` }}
            />
          </div>
        </div>

        {/* 対称性 */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400">対称性スコア</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">X軸対称</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.symmetry.xAxisSymmetry.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">Y軸対称</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.symmetry.yAxisSymmetry.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">中心対称</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.symmetry.centerSymmetry.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">総合対称</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.symmetry.overallSymmetry.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* バランス */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400">バランススコア</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">分布バランス</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.balance.distributionBalance.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">重心バランス</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.balance.centerBalance.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* 見えやすさ */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400">観客からの見えやすさ</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">重なり度</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.visibility.overlapScore.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">広がり</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.visibility.spreadScore.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">密度</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.visibility.densityScore.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded">
              <div className="text-slate-500">総合見えやすさ</div>
              <div className="text-slate-200 font-medium">
                {stats.visualImpact.visibility.overallVisibility.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


