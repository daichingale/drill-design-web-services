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
 * ドリルデータの詳細なマージ（セットごと、メンバーごと）
 */
function mergeDrillData(
  localData: { sets: any[]; members: any[]; title?: string; dataName?: string },
  remoteData: { sets: any[]; members: any[]; title?: string; dataName?: string },
  conflict: ConflictInfo
): any {
  // メンバーをマージ（IDでマッチング）
  const mergedMembers: any[] = [];
  const memberMap = new Map<string, any>();
  
  // リモートのメンバーを先に追加（より新しいデータを優先）
  remoteData.members.forEach((member) => {
    memberMap.set(member.id, { ...member, source: "remote" });
  });
  
  // ローカルのメンバーを追加（リモートにないもののみ）
  localData.members.forEach((member) => {
    if (!memberMap.has(member.id)) {
      memberMap.set(member.id, { ...member, source: "local" });
    }
  });
  
  mergedMembers.push(...Array.from(memberMap.values()).map(m => {
    const { source, ...member } = m;
    return member;
  }));

  // セットをマージ（IDでマッチング）
  const mergedSets: any[] = [];
  const setMap = new Map<string, any>();
  
  // リモートのセットを先に追加
  remoteData.sets.forEach((set) => {
    setMap.set(set.id, { ...set, source: "remote" });
  });
  
  // ローカルのセットを追加（リモートにないもののみ、またはリモートより新しい場合）
  localData.sets.forEach((set) => {
    const remoteSet = setMap.get(set.id);
    if (!remoteSet) {
      setMap.set(set.id, { ...set, source: "local" });
    } else {
      // セットが両方にある場合、位置情報をマージ
      const mergedSet = {
        ...remoteSet,
        positions: mergePositions(
          remoteSet.positions || {},
          set.positions || {},
          conflict
        ),
        positionsByCount: mergePositionsByCount(
          remoteSet.positionsByCount || {},
          set.positionsByCount || {},
          conflict
        ),
      };
      const { source, ...cleanSet } = mergedSet;
      setMap.set(set.id, cleanSet);
    }
  });
  
  mergedSets.push(...Array.from(setMap.values()).map(s => {
    const { source, ...set } = s;
    return set;
  }));

  // タイトルとdataNameはより新しい方を採用
  const title = conflict.remoteTimestamp > conflict.localTimestamp
    ? remoteData.title
    : localData.title;
  const dataName = conflict.remoteTimestamp > conflict.localTimestamp
    ? remoteData.dataName
    : localData.dataName;

  return {
    sets: mergedSets,
    members: mergedMembers,
    title,
    dataName,
  };
}

/**
 * 位置情報をマージ（メンバーごと）
 */
function mergePositions(
  remotePositions: Record<string, { x: number; y: number }>,
  localPositions: Record<string, { x: number; y: number }>,
  conflict: ConflictInfo
): Record<string, { x: number; y: number }> {
  const merged: Record<string, { x: number; y: number }> = {};
  
  // リモートの位置を先に追加
  Object.keys(remotePositions).forEach((memberId) => {
    merged[memberId] = remotePositions[memberId];
  });
  
  // ローカルの位置を追加（リモートにないもののみ）
  Object.keys(localPositions).forEach((memberId) => {
    if (!merged[memberId]) {
      merged[memberId] = localPositions[memberId];
    }
  });
  
  return merged;
}

/**
 * カウントごとの位置情報をマージ
 */
function mergePositionsByCount(
  remotePositionsByCount: Record<number, Record<string, { x: number; y: number }>>,
  localPositionsByCount: Record<number, Record<string, { x: number; y: number }>>,
  conflict: ConflictInfo
): Record<number, Record<string, { x: number; y: number }>> {
  const merged: Record<number, Record<string, { x: number; y: number }>> = {};
  
  // リモートの位置を先に追加
  Object.keys(remotePositionsByCount).forEach((countStr) => {
    const count = Number(countStr);
    merged[count] = { ...remotePositionsByCount[count] };
  });
  
  // ローカルの位置を追加（リモートにないカウントのみ、またはマージ）
  Object.keys(localPositionsByCount).forEach((countStr) => {
    const count = Number(countStr);
    if (!merged[count]) {
      merged[count] = { ...localPositionsByCount[count] };
    } else {
      // 両方にある場合は、メンバーごとにマージ
      merged[count] = mergePositions(
        merged[count],
        localPositionsByCount[count],
        conflict
      );
    }
  });
  
  return merged;
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
      // マージ戦略（詳細実装）
      if (conflict.entityType === "drill" && localData.sets && remoteData.sets) {
        // ドリル全体のマージ
        return mergeDrillData(localData, remoteData, conflict);
      } else if (conflict.entityType === "member") {
        // メンバーの位置情報をマージ
        return {
          ...localData,
          ...remoteData,
          // より新しいタイムスタンプの位置を優先
          positions:
            conflict.remoteTimestamp > conflict.localTimestamp
              ? remoteData.positions
              : localData.positions,
        };
      } else if (conflict.entityType === "set") {
        // セットの位置情報をマージ
        return {
          ...localData,
          ...remoteData,
          positions: mergePositions(
            remoteData.positions || {},
            localData.positions || {},
            conflict
          ),
          positionsByCount: mergePositionsByCount(
            remoteData.positionsByCount || {},
            localData.positionsByCount || {},
            conflict
          ),
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


