// components/drill/NotePanel.tsx
"use client";

type Props = {
  note: string;
  onChangeNote: (value: string) => void;
};

export default function NotePanel({ note, onChangeNote }: Props) {
  return (
    <div className="w-64 h-[600px] border rounded bg-white flex flex-col">
      <div className="px-2 py-1 border-b text-sm font-bold bg-gray-100">
        Set Note
      </div>
      <textarea
        className="flex-1 w-full p-2 text-sm resize-none outline-none"
        value={note}
        onChange={(e) => onChangeNote(e.target.value)}
        placeholder="このセットのメモを書いてください。（Pyware 左の白い欄イメージ）"
      />
    </div>
  );
}
