// hooks/useDrillPageHandlers.ts
// ドリルページのイベントハンドラーを集約するフック

import { useCallback } from "react";
import { addGlobalNotification } from "@/components/ErrorNotification";
import type { WorldPos } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";

type UseDrillPageHandlersParams = {
  selectedIds: string[];
  sets: UiSet[];
  currentSetId: string;
  members: Member[];
  settings: { fieldWidth: number; fieldHeight: number };
  restoreState: (sets: UiSet[], selectedIds: string[], currentSetId: string) => void;
  setMembers: (members: Member[] | ((prev: Member[]) => Member[])) => void;
  handleSelectBulk: (ids: string[]) => void;
  clampAndSnap: (pos: WorldPos) => WorldPos;
  copyToClipboard: (data: any) => void;
  pasteFromClipboard: () => any;
};

/**
 * ドリルページのイベントハンドラーを管理するフック
 */
export function useDrillPageHandlers({
  selectedIds,
  sets,
  currentSetId,
  members,
  settings,
  restoreState,
  setMembers,
  handleSelectBulk,
  clampAndSnap,
  copyToClipboard,
  pasteFromClipboard,
}: UseDrillPageHandlersParams) {
  // コピー機能（選択メンバーの位置をクリップボードに保存）
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "コピーするメンバーを選択してください",
      });
      return;
    }

    const currentSet = sets.find((s) => s.id === currentSetId);
    if (!currentSet) return;

    const positionsToCopy: Record<string, WorldPos> = {};
    selectedIds.forEach((id) => {
      if (currentSet.positions[id]) {
        positionsToCopy[id] = { ...currentSet.positions[id] };
      }
    });

    copyToClipboard({
      type: "members",
      positions: positionsToCopy,
      memberIds: selectedIds,
    });

    addGlobalNotification({
      type: "success",
      message: `${selectedIds.length}個のメンバーをコピーしました`,
    });
  }, [selectedIds, sets, currentSetId, copyToClipboard]);

  // ペースト機能（クリップボードから位置を貼り付け）
  const handlePaste = useCallback(() => {
    const clipboardData = pasteFromClipboard();
    if (!clipboardData || clipboardData.type !== "members") {
      addGlobalNotification({
        type: "warning",
        message: "クリップボードにコピーされたデータがありません",
      });
      return;
    }

    if (clipboardData.memberIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "コピーされたデータにメンバーが含まれていません",
      });
      return;
    }

    // 現在のセットに位置を貼り付け
    const updatedSets = sets.map((set) => {
      if (set.id !== currentSetId) return set;
      return {
        ...set,
        positions: {
          ...set.positions,
          ...clipboardData.positions,
        },
      };
    });

    restoreState(updatedSets, clipboardData.memberIds, currentSetId);
    addGlobalNotification({
      type: "success",
      message: `${clipboardData.memberIds.length}個のメンバーを貼り付けました`,
    });
  }, [sets, currentSetId, pasteFromClipboard, restoreState]);

  // 削除機能（選択メンバーをドリル全体から削除）
  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      addGlobalNotification({
        type: "warning",
        message: "削除するメンバーを選択してください",
      });
      return;
    }

    const ok = window.confirm(
      `選択中のメンバー（${selectedIds.length}人）を削除します。\n` +
        `このドリル内のすべてのセットから、これらのメンバーの位置情報が削除されます。\n\n` +
        `本当に削除してもよろしいですか？`
    );
    if (!ok) return;

    // メンバーリストからも削除
    setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));

    // すべてのセットから、該当メンバーの位置情報を削除
    const updatedSets = sets.map((set) => {
      const newPositions = { ...set.positions };
      selectedIds.forEach((id) => {
        delete newPositions[id];
      });

      let newPositionsByCount = set.positionsByCount;
      if (set.positionsByCount) {
        const updatedByCount: typeof set.positionsByCount = {};
        Object.entries(set.positionsByCount).forEach(([countKey, posMap]) => {
          const newMap = { ...posMap };
          selectedIds.forEach((id) => {
            delete newMap[id];
          });
          // 全て消えたカウントはスキップ
          if (Object.keys(newMap).length > 0) {
            updatedByCount![Number(countKey)] = newMap;
          }
        });
        newPositionsByCount = updatedByCount;
      }

      return {
        ...set,
        positions: newPositions,
        positionsByCount: newPositionsByCount,
      };
    });

    restoreState(updatedSets, [], currentSetId);
    addGlobalNotification({
      type: "success",
      message: `${selectedIds.length}個のメンバーを削除しました`,
    });
  }, [selectedIds, sets, currentSetId, restoreState, setMembers]);

  // 全選択解除
  const handleDeselectAll = useCallback(() => {
    handleSelectBulk([]);
  }, [handleSelectBulk]);

  // フォーメーション自動生成
  const handleAutoGenerateFormation = useCallback(
    async (shape: "circle" | "line" | "v" | "grid" | "auto" = "auto") => {
      const targetIds = selectedIds.length > 0 ? selectedIds : members.map((m) => m.id);
      if (targetIds.length === 0) {
        addGlobalNotification({
          type: "warning",
          message: "フォーメーションを自動生成するメンバーを選択してください",
        });
        return;
      }

      // 形状のデフォルト選択
      let shapeToUse: "circle" | "line" | "v" | "grid" = "circle";
      if (shape === "auto") {
        // 人数が多いときはグリッド、小さいときは円形にする簡易ロジック
        shapeToUse = targetIds.length >= 24 ? "grid" : "circle";
      } else {
        shapeToUse = shape;
      }

      try {
        const partDistribution: Record<string, number> = {};
        members.forEach((m) => {
          if (!partDistribution[m.part]) partDistribution[m.part] = 0;
          partDistribution[m.part] += 1;
        });

        const payload = {
          member_count: targetIds.length,
          part_distribution: partDistribution,
          shape: shapeToUse,
          constraints: {
            fieldWidth: settings.fieldWidth,
            fieldHeight: settings.fieldHeight,
          },
        };

        const resp = await fetch("/api/formation/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error("[auto-formation] API error:", resp.status, text);
          addGlobalNotification({
            type: "error",
            message: "フォーメーション自動生成APIでエラーが発生しました",
          });
          return;
        }

        const data: {
          positions: { x: number; y: number; member_index: number }[];
        } = await resp.json();

        if (!data.positions || data.positions.length === 0) {
          addGlobalNotification({
            type: "warning",
            message: "自動生成結果が空でした",
          });
          return;
        }

        // 現在のSETに結果を適用
        const updatedSets = sets.map((set) => {
          if (set.id !== currentSetId) return set;

          const newPositions = { ...set.positions };
          data.positions.forEach((p) => {
            const id = targetIds[p.member_index];
            if (!id) return;
            newPositions[id] = clampAndSnap({ x: p.x, y: p.y });
          });

          return {
            ...set,
            positions: newPositions,
          };
        });

        restoreState(updatedSets, targetIds, currentSetId);

        addGlobalNotification({
          type: "success",
          message: `フォーメーションを自動生成しました（${shapeToUse} / ${targetIds.length}人）`,
        });
      } catch (error) {
        console.error("[auto-formation] Unexpected error:", error);
        addGlobalNotification({
          type: "error",
          message: "フォーメーション自動生成中にエラーが発生しました",
        });
      }
    },
    [
      selectedIds,
      members,
      settings.fieldWidth,
      settings.fieldHeight,
      sets,
      currentSetId,
      clampAndSnap,
      restoreState,
    ]
  );

  return {
    handleCopy,
    handlePaste,
    handleDelete,
    handleDeselectAll,
    handleAutoGenerateFormation,
  };
}


