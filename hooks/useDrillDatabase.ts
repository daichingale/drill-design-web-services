// hooks/useDrillDatabase.ts
// ドリルのデータベース操作を管理するフック

import { useCallback, useRef, useEffect } from "react";
import { addGlobalNotification } from "@/components/ErrorNotification";
import { saveMembersToLocalStorage } from "@/lib/drill/storage";
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

        console.log("[Load] Setting members first:", {
          membersCount: data.members.length,
          memberIds: data.members.map((m: Member) => m.id),
        });

        // メンバーを先に設定
        setMembers(data.members);
        
        // ローカルストレージにも最新のメンバーを保存（他のページから戻ってきた時に正しく読み込まれるように）
        saveMembersToLocalStorage(data.members);
        console.log("[Load] Saved members to local storage:", {
          membersCount: data.members.length,
        });
        
        // restoreStateに最新のmembersを直接渡す（クロージャの問題を回避）
        const firstSetId = data.sets[0]?.id || "";
        console.log("[Load] Restoring state with members override:", {
          setsCount: data.sets.length,
          membersCount: data.members.length,
        });
        restoreState(data.sets, [], firstSetId, data.members);
        
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

  // 最新の状態を保持するためのref
  const membersRef = useRef<Member[]>(members);
  const setsRef = useRef<UiSet[]>(sets);
  const drillTitleRef = useRef<string>(drillTitle);
  const drillDataNameRef = useRef<string>(drillDataName);
  
  // 最新の状態をrefに反映
  useEffect(() => {
    membersRef.current = members;
    setsRef.current = sets;
    drillTitleRef.current = drillTitle;
    drillDataNameRef.current = drillDataName;
  }, [members, sets, drillTitle, drillDataName]);

  // データベースにドリルを保存（競合解決付き）
  const saveDrillToDatabase = useCallback(async () => {
    try {
      // 最新の状態をrefから取得
      const currentMembers = membersRef.current;
      const currentSets = setsRef.current;
      const currentTitle = drillTitleRef.current;
      const currentDataName = drillDataNameRef.current;
      
      console.log("[Save] Saving drill to database:", {
        drillDbId,
        membersCount: currentMembers.length,
        setsCount: currentSets.length,
        memberIds: currentMembers.map(m => m.id),
      });
      
      const payload = {
        title: currentTitle || "無題",
        dataName: currentDataName || "",
        sets: currentSets,
        members: currentMembers,
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
  }, [drillDbId, setDrillDbId, loadDrillFromDatabase]);

  return {
    loadDrillFromDatabase,
    saveDrillToDatabase,
  };
}


