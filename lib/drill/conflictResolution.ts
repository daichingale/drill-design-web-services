// lib/drill/conflictResolution.ts
// 同時編集の競合解決

export type ConflictResolutionStrategy = "last_write_wins" | "merge" | "reject";

export type EditLock = {
  entityType: "member" | "set" | "drill";
  entityId: string;
  userId: string;
  timestamp: number;
  expiresAt: number; // ロックの有効期限（ミリ秒）
};

export type ConflictInfo = {
  type: "concurrent_edit" | "lock_conflict" | "version_mismatch";
  entityType: "member" | "set" | "drill";
  entityId: string;
  localVersion: number;
  remoteVersion: number;
  localTimestamp: number;
  remoteTimestamp: number;
};

/**
 * ロックが有効かどうかを確認
 */
export function isLockValid(lock: EditLock): boolean {
  return Date.now() < lock.expiresAt;
}

/**
 * ロックを取得できるかどうかを確認
 */
export function canAcquireLock(
  existingLock: EditLock | null,
  userId: string
): boolean {
  if (!existingLock) return true;
  if (!isLockValid(existingLock)) return true; // 期限切れ
  return existingLock.userId === userId; // 自分のロック
}

/**
 * 競合を検出
 */
export function detectConflict(
  localVersion: number,
  remoteVersion: number,
  localTimestamp: number,
  remoteTimestamp: number
): ConflictInfo | null {
  if (localVersion === remoteVersion) return null; // バージョンが一致

  return {
    type: "version_mismatch",
    entityType: "drill",
    entityId: "",
    localVersion,
    remoteVersion,
    localTimestamp,
    remoteTimestamp,
  };
}

/**
 * 競合を解決（Last Write Wins戦略）
 */
export function resolveConflict(
  conflict: ConflictInfo,
  localData: any,
  remoteData: any,
  strategy: ConflictResolutionStrategy = "last_write_wins"
): any {
  switch (strategy) {
    case "last_write_wins":
      // より新しいタイムスタンプのデータを採用
      return conflict.remoteTimestamp > conflict.localTimestamp
        ? remoteData
        : localData;

    case "merge":
      // マージ戦略（簡易実装）
      // メンバーの位置情報をマージ
      if (conflict.entityType === "member") {
        return {
          ...localData,
          ...remoteData,
          // より新しいタイムスタンプの位置を優先
          positions:
            conflict.remoteTimestamp > conflict.localTimestamp
              ? remoteData.positions
              : localData.positions,
        };
      }
      return conflict.remoteTimestamp > conflict.localTimestamp
        ? remoteData
        : localData;

    case "reject":
      // リモートの変更を拒否
      return localData;

    default:
      return localData;
  }
}

/**
 * 操作の優先度を計算（タイムスタンプベース）
 */
export function calculatePriority(timestamp: number): number {
  return timestamp;
}


