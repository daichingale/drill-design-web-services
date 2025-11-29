// components/drill/InstructionsPanel.tsx
"use client";

type Props = {
  instructions: string;
  onChangeInstructions: (value: string) => void;
  setName: string;
  startCount?: number;
  endCount?: number;
  currentCount?: number;
};

export default function InstructionsPanel({
  instructions,
  onChangeInstructions,
  setName,
  startCount,
  endCount,
  currentCount,
}: Props) {
  return (
    <div className="w-full rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
      <div className="px-4 py-2.5 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/90 to-slate-800/70 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            動き方・指示
          </h2>
          {startCount !== undefined && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-slate-300">
                {setName}
              </span>
              {endCount !== undefined && (
                <span className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-slate-400">
                  Count {Math.round(startCount)} → {Math.round(endCount)}
                </span>
              )}
              {currentCount !== undefined && (
                <span className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/60 text-emerald-200">
                  Now: {Math.round(currentCount)}
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400/90 mt-2 leading-relaxed">
          {setName} の動き方や指示を記入してください。
        </p>
      </div>
      <div className="flex-1 min-h-[200px] p-4">
        <textarea
          className="w-full h-full p-4 text-sm text-slate-200 bg-slate-900/40 resize-none outline-none placeholder:text-slate-500/70 focus:bg-slate-900/60 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200 rounded-md border border-slate-700/60"
          value={instructions}
          onChange={(e) => onChangeInstructions(e.target.value)}
          placeholder="例：&#10;・前進8ステップ&#10;・右に90度回転&#10;・フォーメーションを展開&#10;&#10;各メンバーの具体的な動き方や注意事項を記入してください。"
          style={{ minHeight: "200px" }}
        />
      </div>
      <div className="px-4 py-2 border-t border-slate-700/60 bg-slate-800/40">
        <p className="text-[10px] text-slate-400/90">
          💡 この内容は印刷・エクスポート時に含まれます
        </p>
      </div>
    </div>
  );
}
