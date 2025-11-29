// app/settings/page.tsx
"use client";

import { useSettings } from "@/context/SettingsContext";
import { useState } from "react";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localFieldWidth, setLocalFieldWidth] = useState(settings.fieldWidth);
  const [localFieldHeight, setLocalFieldHeight] = useState(settings.fieldHeight);
  const [localGridInterval, setLocalGridInterval] = useState(settings.gridInterval);
  const [localBackgroundColor, setLocalBackgroundColor] = useState(settings.backgroundColor);

  // フィールドサイズの変更を適用
  const handleFieldSizeChange = () => {
    updateSettings({
      fieldWidth: localFieldWidth,
      fieldHeight: localFieldHeight,
    });
  };

  // グリッド間隔の変更を適用
  const handleGridIntervalChange = () => {
    updateSettings({
      gridInterval: localGridInterval,
    });
  };

  // 背景色の変更を適用
  const handleBackgroundColorChange = () => {
    updateSettings({
      backgroundColor: localBackgroundColor,
    });
  };

  return (
    <div className="space-y-8">
      {/* ヘッダーセクション */}
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          フィールドサイズやステップ数、表示の単位などを設定できます。
        </p>
      </section>

      {/* フィールド設定セクション */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          フィールド設定
        </h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              フィールド幅（m）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localFieldWidth}
                onChange={(e) => setLocalFieldWidth(Number(e.target.value))}
                onBlur={handleFieldSizeChange}
                min={10}
                max={100}
                step={1}
                className="w-full max-w-[200px] px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleFieldSizeChange}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
              >
                適用
              </button>
            </div>
            <p className="text-xs text-slate-400">
              標準的なフットボールフィールドは約50mです
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              フィールド高さ（m）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localFieldHeight}
                onChange={(e) => setLocalFieldHeight(Number(e.target.value))}
                onBlur={handleFieldSizeChange}
                min={10}
                max={100}
                step={1}
                className="w-full max-w-[200px] px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleFieldSizeChange}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
              >
                適用
              </button>
            </div>
            <p className="text-xs text-slate-400">
              標準的なフットボールフィールドは約40mです
            </p>
          </div>
        </div>
      </section>

      {/* 表示設定セクション */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          表示設定
        </h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 space-y-6">
          {/* グリッド表示 */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) =>
                  updateSettings({ showGrid: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0 focus:ring-offset-slate-800"
              />
              <span className="text-sm font-medium text-slate-200">
                グリッドを表示
              </span>
            </label>
            <p className="text-xs text-slate-400">
              フィールド上にグリッド線を表示します
            </p>
          </div>

          {/* グリッド間隔 */}
          {settings.showGrid && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                グリッド間隔（ステップ）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localGridInterval}
                  onChange={(e) => setLocalGridInterval(Number(e.target.value))}
                  onBlur={handleGridIntervalChange}
                  min={1}
                  max={16}
                  step={1}
                  className="w-full max-w-[200px] px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleGridIntervalChange}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                >
                  適用
                </button>
              </div>
              <p className="text-xs text-slate-400">
                グリッド線を何ステップごとに表示するか設定します（1 = 1ステップごと、8 = 8ステップごと）
              </p>
            </div>
          )}

          {/* 表示単位 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              表示単位
            </label>
            <select
              value={settings.displayUnit}
              onChange={(e) =>
                updateSettings({
                  displayUnit: e.target.value as "meter" | "yard" | "step",
                })
              }
              className="w-full max-w-[200px] px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            >
              <option value="meter">メートル (m)</option>
              <option value="yard">ヤード (yd)</option>
              <option value="step">ステップ</option>
            </select>
            <p className="text-xs text-slate-400">
              フィールド上の距離表示に使用する単位を選択します
            </p>
          </div>

          {/* 背景色 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.backgroundTransparent}
                  onChange={(e) => {
                    updateSettings({ backgroundTransparent: e.target.checked });
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium text-slate-200">
                  背景を透過にする
                </span>
              </label>
              <p className="text-xs text-slate-400">
                背景を透明にします（エクスポート時に背景が透明になります）
              </p>
            </div>

            {!settings.backgroundTransparent && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  背景色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localBackgroundColor}
                    onChange={(e) => setLocalBackgroundColor(e.target.value)}
                    onBlur={handleBackgroundColorChange}
                    className="w-16 h-10 rounded border border-slate-600 bg-slate-900/50 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localBackgroundColor}
                    onChange={(e) => setLocalBackgroundColor(e.target.value)}
                    onBlur={handleBackgroundColorChange}
                    placeholder="#0a6f2b"
                    className="flex-1 max-w-[200px] px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleBackgroundColorChange}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                  >
                    適用
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  フィールドの背景色を設定します（カラーコードまたはカラーピッカーで指定）
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* リセットボタン */}
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
          <button
            type="button"
            onClick={() => {
              resetSettings();
              setLocalFieldWidth(50);
              setLocalFieldHeight(40);
              setLocalGridInterval(1);
              setLocalBackgroundColor("#0a6f2b");
              // settingsはresetSettings()で更新されるので、localStateは自動的に同期される
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm rounded-lg transition-colors"
          >
            設定をリセット
          </button>
          <p className="text-xs text-slate-400 mt-2">
            すべての設定をデフォルト値に戻します
          </p>
        </div>
      </section>
    </div>
  );
}
