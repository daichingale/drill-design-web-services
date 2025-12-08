// hooks/useIndividualPlacement.ts
"use client";

import { useState, useCallback } from "react";
import type { WorldPos } from "@/lib/drill/types";
import { calculateDistance } from "@/lib/drill/math";
import { STEP_M } from "@/lib/drill/utils";

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
    (
      id: string,
      pos: WorldPos,
      onMove: (id: string, pos: WorldPos) => void,
      existingPositions: Record<string, WorldPos>,
      onCollision?: (message: string) => void
    ) => {
      // 衝突チェック：既存のメンバー位置と重複していないか確認
      const MIN_DISTANCE = STEP_M * 1.5; // 最小距離（1.5歩分）
      
      for (const [memberId, existingPos] of Object.entries(existingPositions)) {
        // 自分自身の位置はチェックしない
        if (memberId === id) continue;
        
        const distance = calculateDistance(pos, existingPos);
        if (distance < MIN_DISTANCE) {
          // 衝突している
          if (onCollision) {
            onCollision(`この位置には既にメンバーが配置されています。別の位置を選択してください。`);
          }
          return false; // 配置を拒否
        }
      }
      
      // 衝突がない場合、配置を実行
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
      return true; // 配置成功
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

