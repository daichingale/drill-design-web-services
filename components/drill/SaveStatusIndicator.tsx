// components/drill/SaveStatusIndicator.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { addGlobalNotification } from "@/components/ErrorNotification";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { saveDrillToLocalStorage, saveDrillMetadata, loadDrillMetadata } from "@/lib/drill/storage";

type SaveStatusIndicatorProps = {
  sets: UiSet[];
  members: Member[];
  drillTitle: string;
  drillDataName: string;
  drillDbId: string | null;
  onSaveToDatabase?: () => Promise<void>;
};

export default function SaveStatusIndicator({
  sets,
  members,
  drillTitle,
  drillDataName,
  drillDbId,
  onSaveToDatabase,
}: SaveStatusIndicatorProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const lastSavedDataRef = useRef<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // データのハッシュを計算（簡易版）
  const getDataHash = (sets: UiSet[], members: Member[]) => {
    return JSON.stringify({ sets, members });
  };

  // 表示を自動的に非表示にする
  const scheduleHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // 2秒後に非表示
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  // 自動保存の実行（通知なし）
  const performAutoSave = () => {
    if (!autoSaveEnabled || isSaving) return;

    setIsSaving(true);
    try {
      // ローカルストレージに保存
      saveDrillToLocalStorage(sets);
      if (drillTitle || drillDataName) {
        saveDrillMetadata({ title: drillTitle, dataName: drillDataName });
      }

      const savedAt = new Date();
      setLastSavedAt(savedAt);
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = getDataHash(sets, members);
      // 自動保存時は短時間表示してから消す
      setIsVisible(true);
      scheduleHide();
    } catch (error) {
      console.error("Auto-save failed:", error);
      // エラー時のみ通知
      addGlobalNotification({
        type: "error",
        message: "自動保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // データ変更の検知
  useEffect(() => {
    const currentHash = getDataHash(sets, members);
    
    // 初回読み込み時は保存済みとして扱う
    if (lastSavedDataRef.current === "") {
      lastSavedDataRef.current = currentHash;
      // メタデータから最後の保存時刻を取得
      const metadata = loadDrillMetadata();
      if (metadata?.savedAt) {
        setLastSavedAt(new Date(metadata.savedAt));
      }
      return;
    }

    // データが変更された場合
    if (currentHash !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
      setIsVisible(true); // 未保存の変更がある場合は表示

      // 自動保存タイマーをリセット
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // 2秒後に自動保存
      if (autoSaveEnabled) {
        autoSaveTimerRef.current = setTimeout(() => {
          performAutoSave();
        }, 2000);
      }
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [sets, members, autoSaveEnabled]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // 手動保存
  const handleManualSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // ローカルストレージに保存
      saveDrillToLocalStorage(sets);
      if (drillTitle || drillDataName) {
        saveDrillMetadata({ title: drillTitle, dataName: drillDataName });
      }

      // データベースにも保存（オプション）
      if (onSaveToDatabase) {
        await onSaveToDatabase();
      }

      const savedAt = new Date();
      setLastSavedAt(savedAt);
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = getDataHash(sets, members);

      // 短時間表示してから消す
      setIsVisible(true);
      scheduleHide();

      addGlobalNotification({
        type: "success",
        message: "保存しました",
      });
    } catch (error) {
      console.error("Manual save failed:", error);
      setIsVisible(true); // エラー時も表示
      addGlobalNotification({
        type: "error",
        message: "保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 時刻のフォーマット
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 表示条件: 未保存の変更がある、または保存中、または保存直後（短時間）
  const shouldShow = isVisible || isSaving || hasUnsavedChanges;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg transition-all ${
      hasUnsavedChanges 
        ? "border-yellow-500/50 shadow-yellow-500/20" 
        : "border-slate-700"
    }`}>
      {/* 自動保存のON/OFF */}
      <button
        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          autoSaveEnabled
            ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
        }`}
        title={autoSaveEnabled ? "自動保存: ON" : "自動保存: OFF"}
      >
        {autoSaveEnabled ? "💾" : "⏸"}
      </button>

      {/* 保存状態の表示 */}
      {isSaving ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>保存中...</span>
        </div>
      ) : hasUnsavedChanges ? (
        <div className="flex items-center gap-2 text-xs text-yellow-400 animate-pulse">
          <span className="text-yellow-500">●</span>
          <span className="font-semibold">未保存の変更</span>
        </div>
      ) : lastSavedAt ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-emerald-400">✓</span>
          <span>保存済み {formatTime(lastSavedAt)}</span>
        </div>
      ) : null}

      {/* 手動保存ボタン */}
      <button
        onClick={handleManualSave}
        disabled={isSaving}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          hasUnsavedChanges
            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="手動保存 (Ctrl+S)"
      >
        保存
      </button>

      {/* データベース保存状態 */}
      {drillDbId && (
        <div className="text-xs text-slate-500" title="データベースに保存済み">
          ☁️
        </div>
      )}
    </div>
  );
}



