// components/ui/snap-mode-toggle.tsx
"use client";

import React from "react";

export type SnapMode = "whole" | "half" | "free";

type Props = {
  value: SnapMode;
  onChange: (mode: SnapMode) => void;
};

const SNAP_OPTIONS: { value: SnapMode; label: string }[] = [
  { value: "whole", label: "ホール" },
  { value: "half", label: "ハーフ" },
  { value: "free", label: "自由" },
];

export function SnapModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs mt-2">
      <span className="text-slate-400 mr-1">スナップ:</span>

      {/* Discord 風トグルグループ */}
      <div className="inline-flex items-center rounded-xl bg-slate-900 border border-slate-700 p-0.5 shadow-lg">
        {SNAP_OPTIONS.map((opt) => {
          const active = opt.value === value;

          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={
                "px-3 py-1 text-[11px] rounded-lg border transition " +
                (active
                  ? // ★ 選択中（めっちゃ分かりやすく）
                    "bg-indigo-500 border-indigo-300 text-white shadow-inner translate-y-[1px]"
                  : // ★ 非選択
                    "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700")
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
