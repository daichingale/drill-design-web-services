// app/settings/grid/page.tsx
"use client";

import { useSettings } from "@/context/SettingsContext";
import { useMenu } from "@/context/MenuContext";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// フィールドテンプレート（将来的に拡張可能）
type FieldTemplate = {
  id: string;
  name: string;
  width: number; // メートル
  height: number; // メートル
  description: string;
  gridInterval: number; // 推奨グリッド間隔
};

const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    id: "standard",
    name: "標準フットボールフィールド",
    width: 50,
    height: 40,
    description: "一般的なフットボールフィールドサイズ",
    gridInterval: 1,
  },
  {
    id: "large-gym",
    name: "大型体育館（30m）",
    width: 30,
    height: 30,
    description: "30m × 30m の大型体育館",
    gridInterval: 1,
  },
  {
    id: "medium-gym",
    name: "中型体育館（20m）",
    width: 20,
    height: 20,
    description: "20m × 20m の中型体育館",
    gridInterval: 1,
  },
  {
    id: "small-stage",
    name: "小さなステージ（10m）",
    width: 10,
    height: 10,
    description: "10m × 10m の小さなステージ",
    gridInterval: 1,
  },
  {
    id: "custom",
    name: "カスタム",
    width: 0,
    height: 0,
    description: "自由にサイズを設定",
    gridInterval: 1,
  },
];

export default function GridCustomizationPage() {
  const { settings, updateSettings } = useSettings();
  const { setMenuGroups } = useMenu();
  const router = useRouter();
  
  const [localFieldWidth, setLocalFieldWidth] = useState(settings.fieldWidth);
  const [localFieldHeight, setLocalFieldHeight] = useState(settings.fieldHeight);
  const [localGridInterval, setLocalGridInterval] = useState(settings.gridInterval);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");

  // テンプレートが選択されたら、フィールドサイズを更新
  useEffect(() => {
    const template = FIELD_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template && template.id !== "custom") {
      setLocalFieldWidth(template.width);
      setLocalFieldHeight(template.height);
      setLocalGridInterval(template.gridInterval);
    }
  }, [selectedTemplate]);

  // 現在の設定がどのテンプレートに近いか判定
  useEffect(() => {
    const matchingTemplate = FIELD_TEMPLATES.find(
      (t) =>
        t.id !== "custom" &&
        Math.abs(t.width - settings.fieldWidth) < 1 &&
        Math.abs(t.height - settings.fieldHeight) < 1
    );
    if (matchingTemplate) {
      setSelectedTemplate(matchingTemplate.id);
    } else {
      setSelectedTemplate("custom");
    }
  }, [settings.fieldWidth, settings.fieldHeight]);

  // フィールドサイズの変更をリアルタイム反映
  useEffect(() => {
    updateSettings({
      fieldWidth: localFieldWidth,
      fieldHeight: localFieldHeight,
    });
  }, [localFieldWidth, localFieldHeight, updateSettings]);

  // グリッド間隔の変更をリアルタイム反映
  useEffect(() => {
    updateSettings({
      gridInterval: localGridInterval,
    });
  }, [localGridInterval, updateSettings]);

  // ステップ数とメートルの計算
  const STEP_M = 5 / 8; // 1ステップ = 0.625m
  const totalStepsX = useMemo(
    () => Math.round(localFieldWidth / STEP_M),
    [localFieldWidth]
  );
  const totalStepsY = useMemo(
    () => Math.round(localFieldHeight / STEP_M),
    [localFieldHeight]
  );

  // メニューグループをレイアウトのメニューバーに登録
  useEffect(() => {
    const menuGroups = [
      {
        label: "ファイル",
        items: [
          {
            label: "設定に戻る",
            icon: "⚙️",
            action: () => router.push("/settings"),
          },
        ],
      },
    ];

    setMenuGroups(menuGroups);
    return () => {
      setMenuGroups([]);
    };
  }, [setMenuGroups, router]);

  return (
    <div className="space-y-8">
      {/* ヘッダーセクション */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← 設定に戻る
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          グリッドカスタマイズ
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          フィールドサイズとグリッド設定を自由にカスタマイズできます。
          30mの大型体育館から小さなステージまで、様々なサイズに対応できます。
        </p>
      </section>

      {/* テンプレート選択 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          フィールドテンプレート
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELD_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedTemplate === template.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-800/80 hover:border-slate-600"
              }`}
            >
              <div className="font-medium text-slate-200 mb-1">
                {template.name}
              </div>
              <div className="text-xs text-slate-400">
                {template.description}
              </div>
              {template.id !== "custom" && (
                <div className="text-xs text-slate-300 mt-2">
                  {template.width}m × {template.height}m
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* フィールドサイズ設定 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          フィールドサイズ
        </h2>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                フィールド幅（m）
              </label>
              <input
                type="number"
                value={localFieldWidth}
                onChange={(e) => setLocalFieldWidth(Number(e.target.value))}
                min={5}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-xs text-slate-400">
                約 {totalStepsX} ステップ（{localFieldWidth.toFixed(2)}m）
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                フィールド高さ（m）
              </label>
              <input
                type="number"
                value={localFieldHeight}
                onChange={(e) => setLocalFieldHeight(Number(e.target.value))}
                min={5}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-xs text-slate-400">
                約 {totalStepsY} ステップ（{localFieldHeight.toFixed(2)}m）
              </p>
            </div>
          </div>

          {/* プレビュー */}
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs font-medium text-slate-300 mb-2">
              フィールドプレビュー
            </div>
            <div className="relative w-full h-48 bg-slate-800 rounded border border-slate-700 overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: settings.showGrid
                    ? `linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
                  backgroundSize: `${(100 / totalStepsX) * localGridInterval}% ${(100 / totalStepsY) * localGridInterval}%`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs text-slate-400 text-center">
                  <div className="font-medium">
                    {localFieldWidth.toFixed(1)}m × {localFieldHeight.toFixed(1)}m
                  </div>
                  <div className="text-[10px] mt-1">
                    {totalStepsX} × {totalStepsY} ステップ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* グリッド設定 */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          グリッド設定
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  グリッド間隔（ステップ）
                </label>
                <input
                  type="number"
                  value={localGridInterval}
                  onChange={(e) =>
                    setLocalGridInterval(Number(e.target.value))
                  }
                  min={1}
                  max={32}
                  step={1}
                  className="w-full max-w-[200px] px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
                />
                <p className="text-xs text-slate-400">
                  グリッド線を何ステップごとに表示するか設定します
                </p>
              </div>

              {/* よく使う間隔のクイック選択 */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  よく使う間隔
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 4, 8, 16, 32].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setLocalGridInterval(interval)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        localGridInterval === interval
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      {interval}ステップ
                    </button>
                  ))}
                </div>
              </div>

              {/* グリッド情報 */}
              <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>横方向のグリッド線:</span>
                    <span className="font-medium">
                      {Math.floor(totalStepsX / localGridInterval) + 1}本
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>縦方向のグリッド線:</span>
                    <span className="font-medium">
                      {Math.floor(totalStepsY / localGridInterval) + 1}本
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>グリッド間隔（メートル）:</span>
                    <span className="font-medium">
                      {(localGridInterval * STEP_M).toFixed(2)}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 保存・適用 */}
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/drill")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
            >
              ドリルエディタで確認
            </button>
            <Link
              href="/settings"
              className="px-4 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 text-sm rounded-lg transition-colors"
            >
              設定に戻る
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            設定は自動的に保存され、ドリルエディタに反映されます
          </p>
        </div>
      </section>
    </div>
  );
}







