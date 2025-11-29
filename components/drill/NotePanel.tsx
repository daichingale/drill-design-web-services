// components/drill/NotePanel.tsx
"use client";

type Props = {
  note: string;
  onChangeNote: (value: string) => void;
};

export default function NotePanel({ note, onChangeNote }: Props) {
  return (
    <div className="w-full rounded-lg border border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
      <div className="px-4 py-2.5 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/90 to-slate-800/70 backdrop-blur-sm">
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          Set Note
        </h2>
      </div>
      <div className="flex-1 min-h-[200px] p-4">
        <textarea
          className="w-full h-full p-4 text-sm resize-none outline-none bg-slate-900/40 text-slate-200 placeholder:text-slate-500/70 focus:bg-slate-900/60 transition-all duration-200 focus:ring-1 focus:ring-emerald-500/30 rounded-md border border-slate-700/60"
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="このセットのメモを書いてください。"
          style={{ minHeight: "200px" }}
        />
      </div>
    </div>
  );
}
