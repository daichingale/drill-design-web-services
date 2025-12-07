// hooks/useDrillDatabase.ts
// ドリルのデータベース操作を管理するフック

import { useCallback } from "react";
import { addGlobalNotification } from "@/components/ErrorNotification";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";

type UseDrillDatabaseParams = {
  drillDbId: string | null;
  setDrillDbId: (id: string | null) => void;
  drillTitle: string;
  drillDataName: string;
  setDrillTitle: (title: string) => void;
  setDrillDataName: (dataName: string) => void;
  sets: UiSet[];
  members: Member[];
  restoreState: (sets: UiSet[], selectedIds: string[], currentSetId: string) => void;
  setMembers: (members: Member[]) => void;
};

type UseDrillDatabaseResult = {
  loadDrillFromDatabase: (id: string) => Promise<void>;
  saveDrillToDatabase: () => Promise<void>;
};

/**
 * ドリルのデータベース操作を管理するフック
 */
export function useDrillDatabase({
  drillDbId,
  setDrillDbId,
  drillTitle,
  drillDataName,
  setDrillTitle,
  setDrillDataName,
  sets,
  members,
  restoreState,
  setMembers,
}: UseDrillDatabaseParams): UseDrillDatabaseResult {
  // データベースからドリルを読み込む
  const loadDrillFromDatabase = useCallback(
    async (id: string) => {
      try {
        console.log("[Load] Loading drill from database, ID:", id);
        const response = await fetch(`/api/drills/${id}`);

        console.log("[Load] Response status:", response.status);
        console.log("[Load] Response ok:", response.ok);

        if (!response.ok) {
          let errorMessage = "Failed to load drill";
          let errorData: any = {};

          try {
            const contentType = response.headers.get("content-type");
            const isJSON = contentType && contentType.includes("application/json");

            if (isJSON) {
              errorData = await response.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
              console.error("[Load] Error response:", JSON.stringify(errorData, null, 2));
              console.error("[Load] Error message:", errorData.message);
              console.error("[Load] Error details:", errorData.details);
            } else {
              const text = await response.text();
              console.error("[Load] Error response text:", text.substring(0, 500));
              errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
            }
          } catch (e) {
            console.error("[Load] Failed to parse error response:", e);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("[Load] Drill data received:", {
          id: data.id,
          title: data.title,
          setsCount: data.sets?.length || 0,
          membersCount: data.members?.length || 0,
        });

        if (!data.sets || !Array.isArray(data.sets)) {
          throw new Error("Invalid drill data: sets is missing or not an array");
        }

        if (!data.members || !Array.isArray(data.members)) {
          throw new Error("Invalid drill data: members is missing or not an array");
        }

        // ドリルデータを復元（SETが0件でも許可）
        const firstSetId = data.sets[0]?.id || "";
        restoreState(data.sets, [], firstSetId);
        setMembers(data.members);
        setDrillTitle(data.title || "");
        setDrillDataName(data.dataName || "");
        console.log("[Load] Drill loaded successfully");
      } catch (error) {
        console.error("[Load] Error loading drill from database:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Load] Full error:", error);
        alert(`ドリルの読み込みに失敗しました: ${errorMessage}`);
      }
    },
    [restoreState, setMembers, setDrillTitle, setDrillDataName]
  );

  // データベースにドリルを保存（競合解決付き）
  const saveDrillToDatabase = useCallback(async () => {
    try {
      const payload = {
        title: drillTitle || "無題",
        dataName: drillDataName || "",
        sets,
        members,
        version: Date.now(), // クライアント側のバージョン
        clientTimestamp: new Date().toISOString(),
      };

      if (drillDbId) {
        // 既存のドリルを更新
        const response = await fetch(`/api/drills/${drillDbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 409) {
            // 競合エラー
            const errorData = await response.json();
            addGlobalNotification({
              type: "warning",
              message:
                errorData.message ||
                "ドリルが他のユーザーによって更新されています。最新の状態を取得してください。",
            });

            // 最新の状態を再読み込み
            await loadDrillFromDatabase(drillDbId);
            return;
          }
          throw new Error("Failed to update drill");
        }

        const data = await response.json();
        addGlobalNotification({
          type: "success",
          message: "データベースに保存しました",
        });
      } else {
        // 新規ドリルを作成
        const response = await fetch("/api/drills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to create drill");
        }

        const data = await response.json();
        setDrillDbId(data.id);

        // URLを更新（リロードしない）
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("id", data.id);
        window.history.pushState({}, "", newUrl.toString());

        addGlobalNotification({
          type: "success",
          message: "データベースに保存しました",
        });
      }
    } catch (error) {
      console.error("Error saving drill to database:", error);
      addGlobalNotification({
        type: "error",
        message: "データベースへの保存に失敗しました",
      });
    }
  }, [drillDbId, drillTitle, drillDataName, sets, members, setDrillDbId, loadDrillFromDatabase]);

  return {
    loadDrillFromDatabase,
    saveDrillToDatabase,
  };
}


