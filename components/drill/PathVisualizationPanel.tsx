// components/drill/PathVisualizationPanel.tsx
"use client";

import { useState } from "react";

type PathVisualizationPanelProps = {
  showPaths: boolean;
  showCollisions: boolean;
  pathSmoothing: boolean;
  onToggleShowPaths: () => void;
  onToggleShowCollisions: () => void;
  onTogglePathSmoothing: () => void;
};

export default function PathVisualizationPanel({
  showPaths,
  showCollisions,
  pathSmoothing,
  onToggleShowPaths,
  onToggleShowCollisions,
  onTogglePathSmoothing,
}: PathVisualizationPanelProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        パス（移動経路）の可視化
      </h2>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showPaths}
            onChange={onToggleShowPaths}
            className="rounded"
          />
          選択メンバーの移動経路を表示
        </label>
        <p className="text-[10px] text-slate-400 ml-6">
          選択されたメンバーのセット間の移動経路を線で表示します
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showCollisions}
            onChange={onToggleShowCollisions}
            className="rounded"
          />
          衝突検知の可視化
        </label>
        <p className="text-[10px] text-slate-400 ml-6">
          メンバー間の距離が近すぎる場合（2ステップ以内）を赤い線で表示します
        </p>
      </div>

      {showPaths && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={pathSmoothing}
              onChange={onTogglePathSmoothing}
              className="rounded"
            />
            パスのスムージング
          </label>
          <p className="text-[10px] text-slate-400 ml-6">
            移動経路を滑らかに表示します
          </p>
        </div>
      )}

      <div className="pt-2 border-t border-slate-700">
        <p className="text-[10px] text-slate-400">
          💡 ヒント: メンバーを選択すると、その移動経路が表示されます
        </p>
      </div>
    </div>
  );
}


