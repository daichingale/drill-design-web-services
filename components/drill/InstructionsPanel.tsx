// components/drill/InstructionsPanel.tsx
"use client";

type Props = {
  instructions: string;
  onChangeInstructions: (value: string) => void;
  setName: string;
};

export default function InstructionsPanel({
  instructions,
  onChangeInstructions,
  setName,
}: Props) {
  return (
    <div className="w-80 shrink-0 rounded-xl border border-slate-700 bg-slate-800/70 p-3 flex flex-col h-full">
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-slate-300 mb-1">
          動き方・指示
        </h2>
        <p className="text-[10px] text-slate-500 mb-2">
          {setName} の動き方や指示を記入してください。
        </p>
      </div>
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50">
        <textarea
          className="w-full h-full p-3 text-sm text-slate-100 bg-transparent resize-none outline-none placeholder:text-slate-500"
          value={instructions}
          onChange={(e) => onChangeInstructions(e.target.value)}
          placeholder="例：&#10;・前進8ステップ&#10;・右に90度回転&#10;・フォーメーションを展開&#10;&#10;各メンバーの具体的な動き方や注意事項を記入してください。"
          style={{ minHeight: "400px" }}
        />
      </div>
      <div className="mt-2 text-[10px] text-slate-400">
        💡 この内容は印刷・エクスポート時に含まれます
      </div>
    </div>
  );
}

