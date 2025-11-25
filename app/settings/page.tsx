// app/settings/page.tsx
"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">設定</h1>
      <p className="text-sm text-gray-700">
        フィールドサイズやステップ数、表示の単位などを後でここから設定できるようにします。
      </p>

      <div className="border rounded bg-white p-4 text-sm text-gray-600 space-y-2">
        <div>
          <label className="block text-xs font-semibold mb-1">
            フィールド幅（m）
          </label>
          <input
            type="number"
            defaultValue={40}
            className="border rounded px-2 py-1 text-sm w-32"
            disabled
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">
            フィールド高さ（m）
          </label>
          <input
            type="number"
            defaultValue={30}
            className="border rounded px-2 py-1 text-sm w-32"
            disabled
          />
        </div>
        <p className="text-xs text-gray-400">
          ※ 今はダミー入力です。機能は次のステップで実装していきます。
        </p>
      </div>
    </div>
  );
}
