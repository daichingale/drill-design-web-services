"use client";

import { useState } from "react";
import type { ConflictInfo } from "@/lib/drill/conflictResolution";

type ConflictResolutionDialogProps = {
  isOpen: boolean;
  conflict: ConflictInfo | null;
  onResolve: (strategy: "last_write_wins" | "merge" | "reject", useRemote: boolean) => void;
  onCancel: () => void;
  localDataPreview?: any;
  remoteDataPreview?: any;
};

/**
 * 競合解決ダイアログ
 */
export default function ConflictResolutionDialog({
  isOpen,
  conflict,
  onResolve,
  onCancel,
  localDataPreview,
  remoteDataPreview,
}: ConflictResolutionDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<"last_write_wins" | "merge" | "reject">("merge");
  const [useRemote, setUseRemote] = useState(true);

  if (!isOpen || !conflict) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ja-JP");
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case "concurrent_edit":
        return "同時編集";
      case "lock_conflict":
        return "ロック競合";
      case "version_mismatch":
        return "バージョン不一致";
      default:
        return type;
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case "drill":
        return "ドリル全体";
      case "set":
        return "セット";
      case "member":
        return "メンバー";
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-100 flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            <span>編集の競合が検出されました</span>
          </h2>

          {/* 競合情報 */}
          <div className="mb-6 space-y-3">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 mb-1">競合タイプ</div>
                  <div className="text-slate-100 font-medium">
                    {getConflictTypeLabel(conflict.type)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">対象</div>
                  <div className="text-slate-100 font-medium">
                    {getEntityTypeLabel(conflict.entityType)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">ローカル更新時刻</div>
                  <div className="text-slate-100">
                    {formatTimestamp(conflict.localTimestamp)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">リモート更新時刻</div>
                  <div className="text-slate-100">
                    {formatTimestamp(conflict.remoteTimestamp)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 解決戦略の選択 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-slate-100">解決方法を選択</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="merge"
                  checked={selectedStrategy === "merge"}
                  onChange={() => setSelectedStrategy("merge")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-100 mb-1">マージ（推奨）</div>
                  <div className="text-sm text-slate-400">
                    両方の変更を統合します。セットやメンバーごとに最新の変更を採用します。
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="last_write_wins"
                  checked={selectedStrategy === "last_write_wins"}
                  onChange={() => setSelectedStrategy("last_write_wins")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-100 mb-1">最新の変更を採用</div>
                  <div className="text-sm text-slate-400">
                    {conflict.remoteTimestamp > conflict.localTimestamp
                      ? "リモート（他のユーザー）の変更を採用します。"
                      : "ローカル（あなた）の変更を採用します。"}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="reject"
                  checked={selectedStrategy === "reject"}
                  onChange={() => setSelectedStrategy("reject")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-100 mb-1">リモートの変更を拒否</div>
                  <div className="text-sm text-slate-400">
                    ローカルの変更を保持し、リモートの変更を無視します。
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* プレビュー（簡易） */}
          {(localDataPreview || remoteDataPreview) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-100">変更内容のプレビュー</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm font-medium text-slate-300 mb-2">ローカル（あなた）</div>
                  <div className="text-xs text-slate-400">
                    {localDataPreview?.sets?.length || 0} セット,{" "}
                    {localDataPreview?.members?.length || 0} メンバー
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm font-medium text-slate-300 mb-2">リモート（他のユーザー）</div>
                  <div className="text-xs text-slate-400">
                    {remoteDataPreview?.sets?.length || 0} セット,{" "}
                    {remoteDataPreview?.members?.length || 0} メンバー
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => onResolve(selectedStrategy, useRemote)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              解決を適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

