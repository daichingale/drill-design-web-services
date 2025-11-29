// components/drill/NextMovePanel.tsx
"use client";

type Props = {
  nextMove: string;
  onChangeNextMove: (value: string) => void;
  currentSetName: string;
};

export default function NextMovePanel({
  nextMove,
  onChangeNextMove,
  currentSetName,
}: Props) {
  return (
    <div className="w-full rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
      <div className="px-4 py-2.5 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/90 to-slate-800/70 backdrop-blur-sm">
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          次の動き
        </h2>
        <p className="text-[10px] text-slate-400/90 mt-1">
          {currentSetName} の次の動きを記入してください
        </p>
      </div>
      <div className="flex-1 min-h-[200px] p-4">
        <textarea
          className="w-full h-full p-4 text-sm text-slate-200 bg-slate-900/40 resize-none outline-none placeholder:text-slate-500/70 focus:bg-slate-900/60 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200 rounded-md border border-slate-700/60"
          value={nextMove}
          onChange={(e) => onChangeNextMove(e.target.value)}
          placeholder="例：&#10;・８拍で振り付けして、８拍マークタイム&#10;・前進16ステップ&#10;・フォーメーションを展開"
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


