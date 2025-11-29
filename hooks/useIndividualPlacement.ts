// hooks/useIndividualPlacement.ts
"use client";

import { useState, useCallback } from "react";
import type { WorldPos } from "@/lib/drill/types";

/**
 * 個別配置モードを管理するフック
 */
export function useIndividualPlacement(selectedIds: string[]) {
  const [individualPlacementMode, setIndividualPlacementMode] = useState(false);
  const [placementQueue, setPlacementQueue] = useState<string[]>([]);

  const handleToggleIndividualPlacement = useCallback(() => {
    if (!individualPlacementMode) {
      // モードを有効化：選択されたメンバーをキューに追加
      if (selectedIds.length > 0) {
        setPlacementQueue([...selectedIds]);
        setIndividualPlacementMode(true);
      } else {
        alert("メンバーを選択してから個別配置モードを有効にしてください");
      }
    } else {
      // モードを無効化
      setIndividualPlacementMode(false);
      setPlacementQueue([]);
    }
  }, [individualPlacementMode, selectedIds]);

  const handlePlaceMember = useCallback(
    (id: string, pos: WorldPos, onMove: (id: string, pos: WorldPos) => void) => {
      onMove(id, pos);
      // キューから削除
      setPlacementQueue((prev) => {
        const newQueue = prev.filter((memberId) => memberId !== id);
        // キューが空になったらモードを無効化
        if (newQueue.length === 0) {
          setIndividualPlacementMode(false);
        }
        return newQueue;
      });
    },
    []
  );

  return {
    individualPlacementMode,
    placementQueue,
    handleToggleIndividualPlacement,
    handlePlaceMember,
  };
}

