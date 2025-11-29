// components/ui/snap-mode-toggle.tsx
"use client";

import React from "react";

export type SnapMode = "whole" | "half" | "free";

type Props = {
  value: SnapMode;
  onChange: (mode: SnapMode) => void;
};

const SNAP_OPTIONS: { value: SnapMode; label: string }[] = [
  { value: "whole", label: "1マス" },
  { value: "half", label: "0.5マス" },
  { value: "free", label: "自由" },
];

export function SnapModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs mt-2">
      <span className="text-slate-400 mr-1">スナップ:</span>

      {/* Discord 風トグルグループ */}
      <div className="inline-flex items-center rounded-lg bg-slate-700/30 border border-slate-600 p-0.5">
        {SNAP_OPTIONS.map((opt) => {
          const active = opt.value === value;

          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={
                "px-3 py-1 text-[11px] rounded transition-colors " +
                (active
                  ? // ★ 選択中
                    "bg-emerald-600/80 text-white shadow-inner"
                  : // ★ 非選択
                    "bg-transparent text-slate-300 hover:bg-slate-700/30 hover:text-slate-100")
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
