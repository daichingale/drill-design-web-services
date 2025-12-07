// lib/drill/collaboration.ts
// 変更履歴を記録するユーティリティ関数

import { prisma } from "@/lib/prisma";

export type ChangeAction =
  | "create"
  | "update"
  | "delete"
  | "move"
  | "add_member"
  | "remove_member"
  | "add_set"
  | "remove_set";

export type EntityType = "set" | "member" | "drill" | "comment";

export interface ChangeRecord {
  drillId: string;
  userId: string;
  action: ChangeAction;
  entityType: EntityType;
  entityId?: string;
  changes?: any;
}

/**
 * 変更履歴を記録する
 */
export async function recordChange(record: ChangeRecord): Promise<void> {
  try {
    await prisma.changeHistory.create({
      data: {
        drillId: record.drillId,
        userId: record.userId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId || null,
        changes: record.changes || null,
      },
    });
  } catch (error) {
    console.error("Failed to record change:", error);
    // エラーが発生しても処理を続行（変更履歴の記録失敗は致命的ではない）
  }
}

/**
 * ドリルへのアクセス権限を確認
 */
export async function checkDrillAccess(
  drillId: string,
  userId: string
): Promise<{ hasAccess: boolean; role: "owner" | "editor" | "viewer" | null }> {
  try {
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!drill) {
      return { hasAccess: false, role: null };
    }

    // オーナーの場合
    if (drill.userId === userId) {
      return { hasAccess: true, role: "owner" };
    }

    // 共同編集者の場合
    const collaborator = drill.collaborators[0];
    if (collaborator) {
      return { hasAccess: true, role: collaborator.role as "owner" | "editor" | "viewer" };
    }

    return { hasAccess: false, role: null };
  } catch (error) {
    console.error("Failed to check drill access:", error);
    return { hasAccess: false, role: null };
  }
}

