// components/drill/DrillControls.tsx
"use client";

import { useState } from "react";
import { SnapModeToggle, type SnapMode } from "@/components/ui/snap-mode-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

type TabType = "set" | "arrangement" | "text";

type SetSummary = {
  id: string;
  name: string;
  startCount: number;
  note?: string;
  instructions?: string;
  nextMove?: string;
};

type Props = {
  sets: SetSummary[];
  currentSetId: string;
  onChangeCurrentSet: (id: string) => void;
  onAddSet?: () => void; // オプショナルに変更
  onDeleteSet?: (id: string) => void;
  onReorderSet?: (id: string, direction: 'up' | 'down') => void;
  onChangeSetName?: (id: string, name: string) => void; // セット名編集
  onCopySet?: (sourceSetId: string, targetSetId?: string) => void; // セット全体をコピー
  onCopySelectedMembers?: (targetSetId: string) => void; // 選択メンバーのみコピー

  onArrangeLineSelected: () => void;
  onArrangeLineBySelectionOrder?: () => void;
  onReorderSelection?: (direction: 'up' | 'down') => void;
  onStartBezierArc: () => void;
  onClearBezierArc: () => void;
  bezierActive: boolean;

  // 形状作成
  onArrangeCircle: (center: { x: number; y: number }, radius: number) => void;
  onArrangeRectangle: (center: { x: number; y: number }, width: number, height: number) => void;
  onArrangeSpiral: (center: { x: number; y: number }, maxRadius: number, turns?: number) => void;
  onArrangeBox: (center: { x: number; y: number }, width: number, height: number, spacing?: number) => void;
  
  // 変形・回転
  onRotateSelected: (center: { x: number; y: number }, angle: number) => void;
  onScaleSelected: (center: { x: number; y: number }, scaleX: number, scaleY?: number) => void;

  // 個別配置
  individualPlacementMode: boolean;
  onToggleIndividualPlacement: () => void;

  onChangeSetStartCount: (id: string, value: number) => void;
  snapMode: SnapMode;
  onChangeSnapMode: (mode: SnapMode) => void;
  confirmedCounts?: number[]; // 確定済みカウントのリスト
  currentCount?: number; // 現在のカウント
  onJumpToCount?: (count: number) => void; // カウントにジャンプする関数

  // テキスト編集（セットIDを指定して更新）
  onChangeNote?: (setId: string, value: string) => void;
  onChangeInstructions?: (setId: string, value: string) => void;
  onChangeNextMove?: (setId: string, value: string) => void;
  
  // クイックアクション
  onQuickDelete?: () => void; // 選択メンバーを削除
  onQuickCopy?: () => void; // 選択メンバーをコピー
  onQuickArrangeLine?: () => void; // 直線整列
  onQuickDeselectAll?: () => void; // 全選択解除
  hasSelection?: boolean; // 選択されているか
  canUndo?: boolean; // Undo可能か
  canRedo?: boolean; // Redo可能か
  onUndo?: () => void; // Undo
  onRedo?: () => void; // Redo
};

export default function DrillControls({
  sets,
  currentSetId,
  onChangeCurrentSet,
  onAddSet,
  onDeleteSet,
  onReorderSet,
  onChangeSetName,
  onCopySet,
  onCopySelectedMembers,
  onArrangeLineSelected,
  onArrangeLineBySelectionOrder,
  onReorderSelection,
  onStartBezierArc,
  onClearBezierArc,
  bezierActive,
  onArrangeCircle,
  onArrangeRectangle,
  onArrangeSpiral,
  onArrangeBox,
  onRotateSelected,
  onScaleSelected,
  individualPlacementMode,
  onToggleIndividualPlacement,
  onChangeSetStartCount,
  snapMode,
  onChangeSnapMode,
  confirmedCounts = [],
  currentCount,
  onJumpToCount,
  onChangeNote,
  onChangeInstructions,
  onChangeNextMove,
  onQuickDelete,
  onQuickCopy,
  onQuickArrangeLine,
  onQuickDeselectAll,
  hasSelection = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: Props) {
  const { t } = useTranslation();
  const currentSet =
    sets.find((s) => s.id === currentSetId) ??
    sets[0] ?? {
      id: currentSetId || "set-placeholder",
      name: "",
      startCount: 0,
      note: "",
      instructions: "",
      nextMove: "",
    };
  
  // 現在のカウントからセットを取得（タイムライン連動用）
  const getSetForCount = (count: number): typeof currentSet | null => {
    if (!sets.length) return null;
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const roundedCount = Math.round(count);
    
    // 現在のカウントが含まれるセットを探す
    for (let i = sortedSets.length - 1; i >= 0; i--) {
      if (roundedCount >= Math.round(sortedSets[i].startCount)) {
        return sortedSets[i];
      }
    }
    return sortedSets[0] || null;
  };
  
  // 現在のカウントに対応するセット（タイムライン連動）
  const countBasedSet = currentCount !== undefined ? getSetForCount(currentCount) : null;
  const displaySet = countBasedSet || currentSet;
  
  // セットのカウント数を計算（次のセットの開始カウント - 現在のセットの開始カウント）
  const getSetCount = (set: typeof displaySet): number => {
    if (!set) return 0;
    const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
    const currentIndex = sortedSets.findIndex((s) => s.id === set.id);
    if (currentIndex === -1) return 0;
    const nextSet = sortedSets[currentIndex + 1];
    if (!nextSet) return 0; // 最終セットは0
    return Math.round(nextSet.startCount) - Math.round(set.startCount);
  };
  const setCount = getSetCount(displaySet);
  
  // 指示・動き方に入力がない場合にバッジを表示（未読マーク）
  const hasUnreadInstructions = !displaySet.instructions?.trim();
  
  // 確定済みカウントのナビゲーション
  const currentConfirmedIndex = confirmedCounts.findIndex(c => c === currentCount);
  const hasPrevConfirmed = currentConfirmedIndex > 0;
  const hasNextConfirmed = currentConfirmedIndex >= 0 && currentConfirmedIndex < confirmedCounts.length - 1;
  
  const jumpToPrevConfirmed = () => {
    if (hasPrevConfirmed && onJumpToCount) {
      onJumpToCount(confirmedCounts[currentConfirmedIndex - 1]);
    }
  };
  
  const jumpToNextConfirmed = () => {
    if (hasNextConfirmed && onJumpToCount) {
      onJumpToCount(confirmedCounts[currentConfirmedIndex + 1]);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>("set");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* タブ */}
      <div className="flex border-b border-slate-700/60 bg-slate-800/40 shrink-0">
        <button
          onClick={() => setActiveTab("set")}
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === "set"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          SET操作
        </button>
        <button
          onClick={() => setActiveTab("arrangement")}
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === "arrangement"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          整列・変形
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
            activeTab === "text"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          テキスト
          {/* Discord風の通知バッジ（指示・動き方が未入力の場合） */}
          {hasUnreadInstructions && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
          )}
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 space-y-4">
        {activeTab === "set" ? (
          <>
      {/* クイックアクション */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400/90 uppercase tracking-wider whitespace-nowrap">クイックアクション</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 直線整列 */}
          {onQuickArrangeLine && (
            <button
              type="button"
              onClick={onQuickArrangeLine}
              disabled={!hasSelection}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-blue-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="選択メンバーを直線に整列"
            >
              📐 直線整列
            </button>
          )}
          
          {/* コピー */}
          {onQuickCopy && (
            <button
              type="button"
              onClick={onQuickCopy}
              disabled={!hasSelection}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-emerald-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="選択メンバーをコピー (Ctrl+C)"
            >
              📋 コピー
            </button>
          )}
          
          {/* 削除 */}
          {onQuickDelete && (
            <button
              type="button"
              onClick={onQuickDelete}
              disabled={!hasSelection}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-red-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="選択メンバーを削除 (Delete)"
            >
              🗑️ 削除
            </button>
          )}
          
          {/* 全選択解除 */}
          {onQuickDeselectAll && (
            <button
              type="button"
              onClick={onQuickDeselectAll}
              disabled={!hasSelection}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-slate-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="全選択解除 (Ctrl+D)"
            >
              ✕ 解除
            </button>
          )}
          
          {/* Undo/Redo */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-amber-600/80 to-amber-700/80 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-amber-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="元に戻す (Ctrl+Z)"
            >
              ↶ Undo
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-amber-600/80 to-amber-700/80 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600/50 disabled:to-slate-700/50 disabled:cursor-not-allowed border border-amber-500/50 disabled:border-slate-600/30 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              title="やり直す (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
          )}
        </div>
      </div>

      {/* スナップ設定 */}
      <SnapModeToggle value={snapMode} onChange={onChangeSnapMode} />

      {/* Set インスペクタ */}
      {currentSet && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/80 p-4 shadow-lg backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400/90 uppercase tracking-wider">{t("set.current")}</span>
              <select
                className="flex-1 min-w-0 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                value={currentSetId}
                onChange={(e) => onChangeCurrentSet(e.target.value)}
              >
                {sets.map((s, index) => (
                  <option key={`${s.id}-${index}`} value={s.id} className="bg-slate-800">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* セット名編集 */}
            {onChangeSetName && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-slate-400/90 uppercase tracking-wider whitespace-nowrap">
                  {t("set.name")}
                </label>
                <input
                  type="text"
                  className="flex-1 min-w-0 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                  value={currentSet.name}
                  onChange={(e) => onChangeSetName(currentSetId, e.target.value)}
                  placeholder="Set 1"
                />
              </div>
            )}

            {/* コピー/ペースト機能 */}
            {(onCopySet || onCopySelectedMembers) && (
              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <span className="text-xs text-slate-400/90 uppercase tracking-wider block">
                  {t("copyPaste.title")}
                </span>
                {onCopySet && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400/80 block">{t("copyPaste.copyAll")}</label>
                    <select
                      className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all duration-200 shadow-inner"
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== currentSetId) {
                          onCopySet(e.target.value, currentSetId);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" className="bg-slate-800">{t("set.selectSourceSet")}</option>
                      {sets.filter((s) => s.id !== currentSetId).map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-800">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {onCopySelectedMembers && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400/80 block">{t("copyPaste.copySelected")}</label>
                    <select
                      className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all duration-200 shadow-inner"
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== currentSetId) {
                          onCopySelectedMembers(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" className="bg-slate-800">{t("set.selectTargetSet")}</option>
                      {sets.filter((s) => s.id !== currentSetId).map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-800">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400/90 uppercase tracking-wider">
                {t("set.startCount")}
              </label>
              <input
                type="number"
                className="w-24 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-1.5 text-right text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                value={currentSet.startCount}
                onChange={(e) =>
                  onChangeSetStartCount(currentSet.id, Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* 確定済みカウントナビゲーション */}
          {confirmedCounts.length > 0 && onJumpToCount && (
            <div className="mt-3 pt-3 border-t border-slate-700/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400/90 uppercase tracking-wider">{t("confirmedCounts.navigation")}</span>
                  <select
                    className="flex-1 rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-500/60 px-3 py-1.5 text-sm text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner"
                    value={currentCount !== undefined && confirmedCounts.includes(Math.round(currentCount)) ? Math.round(currentCount) : ""}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      if (!isNaN(count)) {
                        onJumpToCount(count);
                      }
                    }}
                  >
                    <option value="" className="bg-slate-800">{t("set.selectSet")}</option>
                    {confirmedCounts.map((count) => (
                      <option key={count} value={count} className="bg-slate-800">
                        Count {count}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={jumpToPrevConfirmed}
                    disabled={!hasPrevConfirmed}
                    className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-emerald-200 hover:text-emerald-100 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm"
                    title={t("set.reorderUp")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={jumpToNextConfirmed}
                    disabled={!hasNextConfirmed}
                    className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-emerald-200 hover:text-emerald-100 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm"
                    title={t("set.reorderDown")}
                  >
                    ↓
                  </button>
                  {currentCount !== undefined && confirmedCounts.includes(Math.round(currentCount)) && (
                    <span className="ml-auto text-xs text-emerald-300 font-mono">
                      Count {Math.round(currentCount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* セット操作ボタン */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
            {onReorderSet && (
              <>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'up')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === 0}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-slate-200 hover:text-slate-100 border border-slate-600/40 hover:border-slate-500/60 shadow-sm"
                    title={t("set.reorderUp")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onReorderSet(currentSetId, 'down')}
                  disabled={sets.length <= 1 || sets.findIndex((s) => s.id === currentSetId) === sets.length - 1}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-slate-200 hover:text-slate-100 border border-slate-600/40 hover:border-slate-500/60 shadow-sm"
                    title={t("set.reorderDown")}
                >
                  ↓
                </button>
              </>
            )}
            {onDeleteSet && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`「${currentSet.name}」を削除しますか？`)) {
                    onDeleteSet(currentSetId);
                  }
                }}
                disabled={sets.length <= 1}
                className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-white border border-red-500/50 shadow-md hover:shadow-lg"
                title={t("set.delete")}
              >
                {t("set.delete")}
              </button>
            )}
          </div>
        </div>
      )}
          </>
        ) : activeTab === "arrangement" ? (
          <>
            {/* 整列・ベジェ操作 */}
            <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t("arrangement.title")}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onArrangeLineSelected}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
          >
            {t("arrangement.lineById")}
          </button>
          {onArrangeLineBySelectionOrder && (
            <button
              type="button"
              onClick={onArrangeLineBySelectionOrder}
              className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
            >
              {t("arrangement.lineBySelection")}
            </button>
          )}
          {onReorderSelection && (
            <>
              <button
                type="button"
                onClick={() => onReorderSelection('up')}
                className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-2.5 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
                title={t("set.reorderUp")}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onReorderSelection('down')}
                className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-2.5 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
                title={t("set.reorderDown")}
              >
                ↓
              </button>
            </>
          )}

          <button
            type="button"
            onClick={bezierActive ? onClearBezierArc : onStartBezierArc}
            className={`rounded-md border px-3 py-1.5 text-sm transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap ${
              bezierActive
                ? "bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500/60 text-white"
                : "bg-slate-700/40 hover:bg-slate-700/60 border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100"
            }`}
          >
            {bezierActive ? t("set.clearBezier") : t("set.startBezier")}
          </button>
        </div>
            </div>

            {/* 形状作成 */}
            <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t("set.shapeCreation")}</h3>
              <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const radius = parseFloat(prompt("半径（メートル）を入力してください", "5") || "5");
              if (!isNaN(radius)) {
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onArrangeCircle({ x: 0, y: 0 }, radius);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            ⭕ 円
          </button>

          <button
            type="button"
            onClick={() => {
              const width = parseFloat(prompt("幅（メートル）を入力してください", "10") || "10");
              const height = parseFloat(prompt("高さ（メートル）を入力してください", "10") || "10");
              if (!isNaN(width) && !isNaN(height)) {
                onArrangeRectangle({ x: 0, y: 0 }, width, height);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            ⬜ 四角
          </button>

          <button
            type="button"
            onClick={() => {
              const maxRadius = parseFloat(prompt("最大半径（メートル）を入力してください", "8") || "8");
              const turns = parseFloat(prompt("回転数（デフォルト2）", "2") || "2");
              if (!isNaN(maxRadius)) {
                onArrangeSpiral({ x: 0, y: 0 }, maxRadius, isNaN(turns) ? 2 : turns);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            🌀 うずまき
          </button>

          <button
            type="button"
            onClick={() => {
              const width = parseFloat(prompt("幅（メートル）を入力してください", "8") || "8");
              const height = parseFloat(prompt("高さ（メートル）を入力してください", "8") || "8");
              const spacing = parseFloat(prompt("間隔（メートル、デフォルト1.5）", "1.5") || "1.5");
              if (!isNaN(width) && !isNaN(height)) {
                onArrangeBox({ x: 0, y: 0 }, width, height, isNaN(spacing) ? 1.5 : spacing);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            📦 ボックス
          </button>
              </div>
            </div>

            {/* 変形・回転 */}
            <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t("set.transform")}</h3>
              <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const angleDeg = parseFloat(prompt("回転角度（度）を入力してください", "90") || "90");
              if (!isNaN(angleDeg)) {
                const angleRad = (angleDeg * Math.PI) / 180;
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onRotateSelected({ x: 0, y: 0 }, angleRad);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
          >
            🔄 回転
          </button>

          <button
            type="button"
            onClick={() => {
              const scale = parseFloat(prompt("スケール（倍率）を入力してください", "1.2") || "1.2");
              if (!isNaN(scale)) {
                // 中心は選択されたメンバーの中心を使用（useDrillSets内で計算）
                onScaleSelected({ x: 0, y: 0 }, scale);
              }
            }}
            className="rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 px-3 py-1.5 text-sm text-slate-200 hover:text-slate-100 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap"
          >
            🔍 拡大/縮小
          </button>
              </div>
            </div>

            {/* 個別配置 */}
            <div className="rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/60 p-3 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">個別配置</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleIndividualPlacement}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap ${
                    individualPlacementMode
                      ? "bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 hover:from-emerald-600 hover:to-emerald-700 border-emerald-500/60 text-white"
                      : "bg-slate-700/40 hover:bg-slate-700/60 border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100"
                  }`}
                >
                  {individualPlacementMode ? `📍 ${t("set.individualPlacementOn")}` : `📍 ${t("set.individualPlacement")}`}
                </button>
              </div>
              {individualPlacementMode && (
                <p className="text-[10px] text-slate-400/80 mt-2 px-2 py-1 rounded-md bg-slate-800/30 border border-slate-700/30">
                  フィールドをクリックすると、選択されたメンバーを順番に配置します。
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* テキスト情報 */}
            <div className="rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/80 p-4 shadow-lg backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  セット情報
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {currentCount !== undefined ? `Count ${Math.round(currentCount)}` : `Count ${displaySet.startCount}`}
                </span>
              </div>

              {/* Note（メモ） */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  メモ
                </label>
                <textarea
                  value={displaySet.note || ""}
                  onChange={(e) => onChangeNote?.(displaySet.id, e.target.value)}
                  placeholder="セットのメモを入力..."
                  rows={3}
                  className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner resize-none"
                />
              </div>

              {/* Instructions（指示） */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  指示・動き方
                </label>
                <textarea
                  value={displaySet.instructions || ""}
                  onChange={(e) => onChangeInstructions?.(displaySet.id, e.target.value)}
                  placeholder="このセットでの動き方、指示を入力..."
                  rows={4}
                  className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner resize-none"
                />
              </div>

              {/* Next Move（次の動き） */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  次のセットへの移動
                </label>
                <textarea
                  value={displaySet.nextMove || ""}
                  onChange={(e) => onChangeNextMove?.(displaySet.id, e.target.value)}
                  placeholder="次のセットへの移動方法、カウント数..."
                  rows={3}
                  className="w-full rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 shadow-inner resize-none"
                />
              </div>

              {/* セット情報のサマリー */}
              <div className="pt-3 mt-3 border-t border-slate-700/60 space-y-2">
                <div className="text-xs text-slate-400">
                  <p className="mb-1">
                    <span className="text-slate-500">開始カウント:</span>{" "}
                    <span className="font-mono text-slate-300">
                      {displaySet.startCount}
                    </span>
                  </p>
                  <p className="mb-1">
                    <span className="text-slate-500">セットNo.:</span>{" "}
                    <span className="text-slate-300">
                      {sets.findIndex((s) => s.id === displaySet.id) + 1} / {sets.length}
                    </span>
                  </p>
                  <p className="mb-1">
                    <span className="text-slate-500">セット名:</span>{" "}
                    <span className="text-slate-300">{displaySet.name}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">セットのカウント数:</span>{" "}
                    <span className="font-mono text-slate-300">
                      {setCount}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
