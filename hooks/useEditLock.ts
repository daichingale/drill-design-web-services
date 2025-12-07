// hooks/useEditLock.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

type LockInfo = {
  locked: boolean;
  lockedBy?: string;
  isOwnedByMe?: boolean;
  expiresAt?: number;
};

type UseEditLockOptions = {
  drillId: string | null;
  entityType: "member" | "set" | "drill";
  entityId: string;
  enabled?: boolean;
  lockDuration?: number; // ミリ秒
  onLockAcquired?: () => void;
  onLockFailed?: (reason: string) => void;
};

/**
 * 編集ロック管理フック
 */
export function useEditLock({
  drillId,
  entityType,
  entityId,
  enabled = true,
  lockDuration = 30000, // 30秒
  onLockAcquired,
  onLockFailed,
}: UseEditLockOptions) {
  const { data: session } = useSession();
  const [lockInfo, setLockInfo] = useState<LockInfo>({ locked: false });
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockKeyRef = useRef<string | null>(null);

  // ロックを取得
  const acquireLock = useCallback(async () => {
    if (!enabled || !drillId || !session?.user?.id) return false;

    try {
      const response = await fetch(`/api/drills/${drillId}/locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          duration: lockDuration,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        lockKeyRef.current = data.lockKey;
        setLockInfo({
          locked: true,
          isOwnedByMe: true,
          expiresAt: data.expiresAt,
        });
        onLockAcquired?.();
        return true;
      } else if (response.status === 409) {
        // 競合: 他のユーザーがロックしている
        const data = await response.json();
        setLockInfo({
          locked: true,
          lockedBy: data.lockedBy,
          isOwnedByMe: false,
          expiresAt: data.expiresAt,
        });
        onLockFailed?.("他のユーザーが編集中です");
        return false;
      } else {
        onLockFailed?.("ロックの取得に失敗しました");
        return false;
      }
    } catch (error) {
      console.error("Failed to acquire lock:", error);
      onLockFailed?.("ロックの取得に失敗しました");
      return false;
    }
  }, [enabled, drillId, entityType, entityId, lockDuration, session?.user?.id, onLockAcquired, onLockFailed]);

  // ロックを解放
  const releaseLock = useCallback(async () => {
    if (!drillId || !lockKeyRef.current) return;

    try {
      await fetch(`/api/drills/${drillId}/locks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
        }),
      });
      lockKeyRef.current = null;
      setLockInfo({ locked: false });
    } catch (error) {
      console.error("Failed to release lock:", error);
    }
  }, [drillId, entityType, entityId]);

  // ロック状態を更新
  const refreshLock = useCallback(async () => {
    if (!enabled || !drillId) return;

    try {
      const response = await fetch(
        `/api/drills/${drillId}/locks?entityType=${entityType}&entityId=${entityId}`
      );
      if (response.ok) {
        const data = await response.json();
        setLockInfo(data);
      }
    } catch (error) {
      console.error("Failed to refresh lock:", error);
    }
  }, [enabled, drillId, entityType, entityId]);

  // ロックの自動更新（期限の80%経過時に更新）
  useEffect(() => {
    if (!lockInfo.locked || !lockInfo.isOwnedByMe || !lockInfo.expiresAt) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const timeUntilRefresh = (lockInfo.expiresAt - Date.now()) * 0.8;
    if (timeUntilRefresh > 0) {
      refreshIntervalRef.current = setTimeout(() => {
        acquireLock();
      }, timeUntilRefresh);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [lockInfo, acquireLock]);

  // コンポーネントのアンマウント時にロックを解放
  useEffect(() => {
    return () => {
      releaseLock();
    };
  }, [releaseLock]);

  // 定期的にロック状態を更新
  useEffect(() => {
    if (!enabled || !drillId) return;

    refreshLock();
    const interval = setInterval(refreshLock, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [enabled, drillId, refreshLock]);

  return {
    lockInfo,
    acquireLock,
    releaseLock,
    refreshLock,
  };
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

type LockInfo = {
  locked: boolean;
  lockedBy?: string;
  isOwnedByMe?: boolean;
  expiresAt?: number;
};

type UseEditLockOptions = {
  drillId: string | null;
  entityType: "member" | "set" | "drill";
  entityId: string;
  enabled?: boolean;
  lockDuration?: number; // ミリ秒
  onLockAcquired?: () => void;
  onLockFailed?: (reason: string) => void;
};

/**
 * 編集ロック管理フック
 */
export function useEditLock({
  drillId,
  entityType,
  entityId,
  enabled = true,
  lockDuration = 30000, // 30秒
  onLockAcquired,
  onLockFailed,
}: UseEditLockOptions) {
  const { data: session } = useSession();
  const [lockInfo, setLockInfo] = useState<LockInfo>({ locked: false });
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockKeyRef = useRef<string | null>(null);

  // ロックを取得
  const acquireLock = useCallback(async () => {
    if (!enabled || !drillId || !session?.user?.id) return false;

    try {
      const response = await fetch(`/api/drills/${drillId}/locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          duration: lockDuration,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        lockKeyRef.current = data.lockKey;
        setLockInfo({
          locked: true,
          isOwnedByMe: true,
          expiresAt: data.expiresAt,
        });
        onLockAcquired?.();
        return true;
      } else if (response.status === 409) {
        // 競合: 他のユーザーがロックしている
        const data = await response.json();
        setLockInfo({
          locked: true,
          lockedBy: data.lockedBy,
          isOwnedByMe: false,
          expiresAt: data.expiresAt,
        });
        onLockFailed?.("他のユーザーが編集中です");
        return false;
      } else {
        onLockFailed?.("ロックの取得に失敗しました");
        return false;
      }
    } catch (error) {
      console.error("Failed to acquire lock:", error);
      onLockFailed?.("ロックの取得に失敗しました");
      return false;
    }
  }, [enabled, drillId, entityType, entityId, lockDuration, session?.user?.id, onLockAcquired, onLockFailed]);

  // ロックを解放
  const releaseLock = useCallback(async () => {
    if (!drillId || !lockKeyRef.current) return;

    try {
      await fetch(`/api/drills/${drillId}/locks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
        }),
      });
      lockKeyRef.current = null;
      setLockInfo({ locked: false });
    } catch (error) {
      console.error("Failed to release lock:", error);
    }
  }, [drillId, entityType, entityId]);

  // ロック状態を更新
  const refreshLock = useCallback(async () => {
    if (!enabled || !drillId) return;

    try {
      const response = await fetch(
        `/api/drills/${drillId}/locks?entityType=${entityType}&entityId=${entityId}`
      );
      if (response.ok) {
        const data = await response.json();
        setLockInfo(data);
      }
    } catch (error) {
      console.error("Failed to refresh lock:", error);
    }
  }, [enabled, drillId, entityType, entityId]);

  // ロックの自動更新（期限の80%経過時に更新）
  useEffect(() => {
    if (!lockInfo.locked || !lockInfo.isOwnedByMe || !lockInfo.expiresAt) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const timeUntilRefresh = (lockInfo.expiresAt - Date.now()) * 0.8;
    if (timeUntilRefresh > 0) {
      refreshIntervalRef.current = setTimeout(() => {
        acquireLock();
      }, timeUntilRefresh);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [lockInfo, acquireLock]);

  // コンポーネントのアンマウント時にロックを解放
  useEffect(() => {
    return () => {
      releaseLock();
    };
  }, [releaseLock]);

  // 定期的にロック状態を更新
  useEffect(() => {
    if (!enabled || !drillId) return;

    refreshLock();
    const interval = setInterval(refreshLock, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [enabled, drillId, refreshLock]);

  return {
    lockInfo,
    acquireLock,
    releaseLock,
    refreshLock,
  };
}

