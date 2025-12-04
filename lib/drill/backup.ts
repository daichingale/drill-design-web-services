// lib/drill/backup.ts
// バックアップ・復元機能

import type { UiSet } from "./uiTypes";
import type { Member } from "@/context/MembersContext";
import type { Settings } from "@/context/SettingsContext";

const STORAGE_KEY_BACKUPS = "drill-design-backups";
const STORAGE_KEY_VERSION_HISTORY = "drill-design-version-history";
const MAX_BACKUPS = 20; // 最大バックアップ数
const MAX_VERSION_HISTORY = 100; // 最大バージョン履歴数

export type BackupData = {
  id: string;
  name: string;
  sets: UiSet[];
  members: Member[];
  settings?: Settings;
  createdAt: string;
  metadata?: {
    title?: string;
    dataName?: string;
  };
};

export type VersionHistory = {
  id: string;
  sets: UiSet[];
  members: Member[];
  settings?: Settings;
  createdAt: string;
  description?: string;
};

// ===== バックアップ機能 =====

/**
 * バックアップを作成
 */
export function createBackup(
  sets: UiSet[],
  members: Member[],
  settings?: Settings,
  name?: string,
  metadata?: { title?: string; dataName?: string }
): string {
  try {
    const backup: BackupData = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: name || `バックアップ ${new Date().toLocaleString("ja-JP")}`,
      sets,
      members,
      settings,
      createdAt: new Date().toISOString(),
      metadata,
    };

    const backups = getBackups();
    backups.unshift(backup); // 最新を先頭に

    // 最大数を超えた場合は古いものを削除
    if (backups.length > MAX_BACKUPS) {
      backups.splice(MAX_BACKUPS);
    }

    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));
    return backup.id;
  } catch (error) {
    console.error("Failed to create backup:", error);
    throw error;
  }
}

/**
 * バックアップ一覧を取得
 */
export function getBackups(): BackupData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BACKUPS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get backups:", error);
    return [];
  }
}

/**
 * バックアップを復元
 */
export function restoreBackup(backupId: string): BackupData | null {
  try {
    const backups = getBackups();
    const backup = backups.find((b) => b.id === backupId);
    return backup || null;
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return null;
  }
}

/**
 * バックアップを削除
 */
export function deleteBackup(backupId: string): boolean {
  try {
    const backups = getBackups();
    const filtered = backups.filter((b) => b.id !== backupId);
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Failed to delete backup:", error);
    return false;
  }
}

/**
 * すべてのバックアップを削除
 */
export function clearAllBackups(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY_BACKUPS);
    return true;
  } catch (error) {
    console.error("Failed to clear backups:", error);
    return false;
  }
}

// ===== バージョン履歴機能 =====

/**
 * バージョン履歴に追加
 */
export function addVersionHistory(
  sets: UiSet[],
  members: Member[],
  settings?: Settings,
  description?: string
): string {
  try {
    const version: VersionHistory = {
      id: `version-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sets,
      members,
      settings,
      createdAt: new Date().toISOString(),
      description,
    };

    const history = getVersionHistory();
    history.unshift(version); // 最新を先頭に

    // 最大数を超えた場合は古いものを削除
    if (history.length > MAX_VERSION_HISTORY) {
      history.splice(MAX_VERSION_HISTORY);
    }

    localStorage.setItem(STORAGE_KEY_VERSION_HISTORY, JSON.stringify(history));
    return version.id;
  } catch (error) {
    console.error("Failed to add version history:", error);
    throw error;
  }
}

/**
 * バージョン履歴一覧を取得
 */
export function getVersionHistory(): VersionHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VERSION_HISTORY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get version history:", error);
    return [];
  }
}

/**
 * バージョンを復元
 */
export function restoreVersion(versionId: string): VersionHistory | null {
  try {
    const history = getVersionHistory();
    const version = history.find((v) => v.id === versionId);
    return version || null;
  } catch (error) {
    console.error("Failed to restore version:", error);
    return null;
  }
}

/**
 * バージョン履歴を削除
 */
export function deleteVersion(versionId: string): boolean {
  try {
    const history = getVersionHistory();
    const filtered = history.filter((v) => v.id !== versionId);
    localStorage.setItem(STORAGE_KEY_VERSION_HISTORY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Failed to delete version:", error);
    return false;
  }
}

/**
 * すべてのバージョン履歴を削除
 */
export function clearVersionHistory(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY_VERSION_HISTORY);
    return true;
  } catch (error) {
    console.error("Failed to clear version history:", error);
    return false;
  }
}

// ===== 自動バックアップ機能 =====

let autoBackupTimer: NodeJS.Timeout | null = null;

/**
 * 自動バックアップをスケジュール
 */
export function scheduleAutoBackup(
  sets: UiSet[],
  members: Member[],
  settings?: Settings,
  intervalMs: number = 300000 // デフォルト5分
): void {
  if (autoBackupTimer) {
    clearTimeout(autoBackupTimer);
  }

  autoBackupTimer = setTimeout(() => {
    try {
      createBackup(sets, members, settings, undefined, undefined);
      console.log("Auto-backup created");
    } catch (error) {
      console.error("Auto-backup failed:", error);
    }
  }, intervalMs);
}

/**
 * 自動バックアップをキャンセル
 */
export function cancelAutoBackup(): void {
  if (autoBackupTimer) {
    clearTimeout(autoBackupTimer);
    autoBackupTimer = null;
  }
}



