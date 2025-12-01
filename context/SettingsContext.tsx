// context/SettingsContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type DisplayUnit = "meter" | "yard" | "step";

export type MemberAddMode = "quick" | "careful";

export type Settings = {
  // フィールドサイズ
  fieldWidth: number; // メートル
  fieldHeight: number; // メートル
  
  // グリッド設定
  showGrid: boolean;
  gridInterval: number; // ステップ単位（例: 1 = 1ステップごと、8 = 8ステップごと）
  
  // 表示単位
  displayUnit: DisplayUnit;
  
  // 背景色
  backgroundColor: string;
  backgroundTransparent: boolean; // 背景を透過にするか
  
  // 再生設定
  playbackBPM: number; // 再生速度（BPM）

  // メンバー追加モード
  memberAddMode: MemberAddMode;
};

const DEFAULT_SETTINGS: Settings = {
  fieldWidth: 50,
  fieldHeight: 40,
  showGrid: true,
  gridInterval: 1, // 1ステップごと
  displayUnit: "meter",
  backgroundColor: "#ffffff", // 白色
  backgroundTransparent: false,
  playbackBPM: 120, // デフォルトBPM
  memberAddMode: "quick",
};

const STORAGE_KEY = "drill-settings";

// ローカルストレージから設定を読み込む（クライアント専用）
const loadSettingsFromStorage = (): Settings => {
  if (typeof window === "undefined") {
    // サーバー側レンダリング時は必ずデフォルト値を返す
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // デフォルト設定とマージ（新しい設定項目が追加された場合に対応）
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load settings from storage:", error);
  }
  
  return DEFAULT_SETTINGS;
};

// ローカルストレージに設定を保存
const saveSettingsToStorage = (settings: Settings) => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings to storage:", error);
  }
};

type SettingsContextType = {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
  
  // 表示単位変換ヘルパー
  convertToDisplayUnit: (valueInMeters: number) => number;
  formatDisplayValue: (valueInMeters: number) => string;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  // サーバー・クライアント初期レンダリングでは必ず同じ値（DEFAULT_SETTINGS）になるようにする
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // マウント後にローカルストレージから設定を読み込んで反映（クライアント側のみ）
  useEffect(() => {
    const storedSettings = loadSettingsFromStorage();
    setSettings(storedSettings);
  }, []);

  // 設定を更新
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveSettingsToStorage(newSettings);
      console.log("Settings updated:", newSettings);
      return newSettings;
    });
  }, []);

  // 設定をリセット
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  // 表示単位に変換
  const convertToDisplayUnit = useCallback((valueInMeters: number): number => {
    switch (settings.displayUnit) {
      case "meter":
        return valueInMeters;
      case "yard":
        return valueInMeters * 1.09361; // 1メートル = 1.09361ヤード
      case "step":
        const STEP_M = 5 / 8; // 1ステップ = 0.625m
        return valueInMeters / STEP_M;
      default:
        return valueInMeters;
    }
  }, [settings.displayUnit]);

  // 表示用のフォーマット
  const formatDisplayValue = useCallback((valueInMeters: number): string => {
    const value = convertToDisplayUnit(valueInMeters);
    const unit = settings.displayUnit === "meter" ? "m" : settings.displayUnit === "yard" ? "yd" : "step";
    return `${value.toFixed(2)} ${unit}`;
  }, [convertToDisplayUnit, settings.displayUnit]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        convertToDisplayUnit,
        formatDisplayValue,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

