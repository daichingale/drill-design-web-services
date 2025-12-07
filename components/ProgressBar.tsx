// components/ProgressBar.tsx
"use client";

import { useState, useEffect } from "react";

type ProgressBarProps = {
  progress: number; // 0-100
  message?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
};

export default function ProgressBar({
  progress,
  message,
  onCancel,
  showCancel = false,
  className = "",
}: ProgressBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (progress > 0 && progress < 100) {
      setIsVisible(true);
    } else if (progress >= 100) {
      // 完了後、少し待ってから非表示
      setTimeout(() => setIsVisible(false), 500);
    } else {
      setIsVisible(false);
    }
  }, [progress]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-4 min-w-[300px] max-w-[500px] ${className}`}
    >
      {message && (
        <div className="mb-2 text-sm text-slate-200 font-medium">{message}</div>
      )}
      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
        {showCancel && onCancel && (
          <button
            onClick={onCancel}
            className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}

