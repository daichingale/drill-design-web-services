// hooks/useConflictResolution.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { ConflictInfo } from "@/lib/drill/conflictResolution";
import { resolveConflict } from "@/lib/drill/conflictResolution";
import { addGlobalNotification } from "@/components/ErrorNotification";

type ConflictResolutionOptions = {
  drillId: string | null;
  onConflictDetected?: (conflict: ConflictInfo) => void;
  onConflictResolved?: (resolved: any) => void;
};

/**
 * 競合解決フック
 */
export function useConflictResolution({
  drillId,
  onConflictDetected,
  onConflictResolved,
}: ConflictResolutionOptions) {
  const { data: session } = useSession();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const localVersionRef = useRef<number>(Date.now());
  const pendingOperationsRef = useRef<Map<string, any>>(new Map());

  // 操作をキューに追加
  const queueOperation = useCallback(
    (operationId: string, operation: any) => {
      pendingOperationsRef.current.set(operationId, {
        ...operation,
        timestamp: Date.now(),
        userId: session?.user?.id,
      });
    },
    [session?.user?.id]
  );

  // 操作を実行（競合チェック付き）
  const executeOperation = useCallback(
    async (
      operationId: string,
      operation: () => Promise<any>,
      localData: any
    ): Promise<any> => {
      if (!drillId) return null;

      try {
        // 操作を実行
        const result = await operation();

        // 成功したらキューから削除
        pendingOperationsRef.current.delete(operationId);
        localVersionRef.current = Date.now();

        return result;
      } catch (error: any) {
        // 409 Conflictエラーの場合
        if (error.status === 409 || error.response?.status === 409) {
          const conflictData = error.response?.data || error.data;
          const conflict: ConflictInfo = {
            type: "version_mismatch",
            entityType: "drill",
            entityId: drillId,
            localVersion: localVersionRef.current,
            remoteVersion: conflictData?.serverVersion || Date.now(),
            localTimestamp: Date.now(),
            remoteTimestamp: conflictData?.serverVersion || Date.now(),
          };

          setConflicts((prev) => [...prev, conflict]);
          onConflictDetected?.(conflict);

          // 競合を解決（Last Write Wins戦略）
          const resolved = resolveConflict(
            conflict,
            localData,
            conflictData?.remoteData || localData,
            "last_write_wins"
          );

          addGlobalNotification({
            type: "warning",
            message: "編集の競合が検出されました。最新の状態を取得します。",
          });

          onConflictResolved?.(resolved);
          return resolved;
        }

        throw error;
      }
    },
    [drillId, onConflictDetected, onConflictResolved]
  );

  // リモート変更を適用（競合チェック付き）
  const applyRemoteChange = useCallback(
    (
      remoteData: any,
      remoteTimestamp: number,
      localData: any
    ): { hasConflict: boolean; resolvedData: any } => {
      const localTimestamp = localVersionRef.current;

      // タイムスタンプを比較
      if (remoteTimestamp > localTimestamp) {
        // リモートの方が新しい場合はリモートを採用
        localVersionRef.current = remoteTimestamp;
        return { hasConflict: false, resolvedData: remoteData };
      } else if (remoteTimestamp < localTimestamp) {
        // ローカルの方が新しい場合は競合
        const conflict: ConflictInfo = {
          type: "concurrent_edit",
          entityType: "drill",
          entityId: drillId || "",
          localVersion: localTimestamp,
          remoteVersion: remoteTimestamp,
          localTimestamp,
          remoteTimestamp,
        };

        setConflicts((prev) => [...prev, conflict]);
        onConflictDetected?.(conflict);

        // 競合を解決
        const resolved = resolveConflict(
          conflict,
          localData,
          remoteData,
          "last_write_wins"
        );

        return { hasConflict: true, resolvedData: resolved };
      }

      // タイムスタンプが同じ場合は競合なし
      return { hasConflict: false, resolvedData: localData };
    },
    [drillId, onConflictDetected]
  );

  // 競合をクリア
  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    conflicts,
    queueOperation,
    executeOperation,
    applyRemoteChange,
    clearConflicts,
    localVersion: localVersionRef.current,
  };
}


