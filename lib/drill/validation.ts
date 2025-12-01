// lib/drill/validation.ts
// ドリルデータのバリデーション機能

import type { UiSet } from "./uiTypes";
import type { Member } from "./types";
import type { Settings } from "@/context/SettingsContext";

export type ValidationError = {
  type: "error" | "warning";
  field: string;
  message: string;
  details?: any;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

// デフォルトのフィールドサイズ（設定が提供されない場合）
const DEFAULT_FIELD_WIDTH = 53.34; // メートル
const DEFAULT_FIELD_HEIGHT = 100; // メートル

/**
 * メンバーIDの重複をチェック
 */
export function validateMemberIds(members: Member[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  members.forEach((member, index) => {
    if (!member.id || typeof member.id !== "string") {
      errors.push({
        type: "error",
        field: `members[${index}].id`,
        message: "メンバーIDが無効です",
        details: { member },
      });
      return;
    }

    if (seenIds.has(member.id)) {
      errors.push({
        type: "error",
        field: `members[${index}].id`,
        message: `メンバーID "${member.id}" が重複しています`,
        details: { memberId: member.id, index },
      });
    } else {
      seenIds.add(member.id);
    }
  });

  return errors;
}

/**
 * セットの開始カウントの重複をチェック
 */
export function validateSetStartCounts(sets: UiSet[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenCounts = new Map<number, string[]>();

  sets.forEach((set, index) => {
    const startCount = Math.round(set.startCount);
    if (seenCounts.has(startCount)) {
      const existingSetIds = seenCounts.get(startCount) || [];
      existingSetIds.push(set.id);
      seenCounts.set(startCount, existingSetIds);
    } else {
      seenCounts.set(startCount, [set.id]);
    }
  });

  seenCounts.forEach((setIds, count) => {
    if (setIds.length > 1) {
      errors.push({
        type: "warning",
        field: "sets.startCount",
        message: `開始カウント ${count} が ${setIds.length} 個のセットで重複しています`,
        details: { count, setIds },
      });
    }
  });

  return errors;
}

/**
 * 座標がフィールド範囲内かチェック
 */
export function validateCoordinates(
  sets: UiSet[],
  members: Member[],
  settings?: Settings
): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldWidth = settings?.fieldWidth || DEFAULT_FIELD_WIDTH;
  const fieldHeight = settings?.fieldHeight || DEFAULT_FIELD_HEIGHT;

  const memberIds = new Set(members.map((m) => m.id));

  sets.forEach((set, setIndex) => {
    // positions のチェック
    if (set.positions) {
      Object.entries(set.positions).forEach(([memberId, pos]) => {
        if (!memberIds.has(memberId)) {
          errors.push({
            type: "warning",
            field: `sets[${setIndex}].positions[${memberId}]`,
            message: `存在しないメンバーID "${memberId}" の位置が設定されています`,
            details: { setId: set.id, memberId },
          });
        }

        if (typeof pos.x !== "number" || typeof pos.y !== "number") {
          errors.push({
            type: "error",
            field: `sets[${setIndex}].positions[${memberId}]`,
            message: `座標が無効です（x: ${pos.x}, y: ${pos.y}）`,
            details: { setId: set.id, memberId, position: pos },
          });
          return;
        }

        if (pos.x < 0 || pos.x > fieldWidth) {
          errors.push({
            type: "warning",
            field: `sets[${setIndex}].positions[${memberId}].x`,
            message: `X座標 ${pos.x.toFixed(2)} がフィールド範囲外です（0-${fieldWidth}）`,
            details: { setId: set.id, memberId, x: pos.x, fieldWidth },
          });
        }

        if (pos.y < 0 || pos.y > fieldHeight) {
          errors.push({
            type: "warning",
            field: `sets[${setIndex}].positions[${memberId}].y`,
            message: `Y座標 ${pos.y.toFixed(2)} がフィールド範囲外です（0-${fieldHeight}）`,
            details: { setId: set.id, memberId, y: pos.y, fieldHeight },
          });
        }
      });
    }

    // positionsByCount のチェック
    if (set.positionsByCount) {
      Object.entries(set.positionsByCount).forEach(([countStr, memberPositions]) => {
        const count = Number(countStr);
        if (isNaN(count)) {
          errors.push({
            type: "error",
            field: `sets[${setIndex}].positionsByCount[${countStr}]`,
            message: `無効なカウント値: ${countStr}`,
            details: { setId: set.id, countStr },
          });
          return;
        }

        Object.entries(memberPositions).forEach(([memberId, pos]) => {
          if (!memberIds.has(memberId)) {
            errors.push({
              type: "warning",
              field: `sets[${setIndex}].positionsByCount[${count}][${memberId}]`,
              message: `存在しないメンバーID "${memberId}" の位置が設定されています`,
              details: { setId: set.id, memberId, count },
            });
          }

          if (typeof pos.x !== "number" || typeof pos.y !== "number") {
            errors.push({
              type: "error",
              field: `sets[${setIndex}].positionsByCount[${count}][${memberId}]`,
              message: `座標が無効です（x: ${pos.x}, y: ${pos.y}）`,
              details: { setId: set.id, memberId, count, position: pos },
            });
            return;
          }

          if (pos.x < 0 || pos.x > fieldWidth) {
            errors.push({
              type: "warning",
              field: `sets[${setIndex}].positionsByCount[${count}][${memberId}].x`,
              message: `X座標 ${pos.x.toFixed(2)} がフィールド範囲外です（0-${fieldWidth}）`,
              details: { setId: set.id, memberId, count, x: pos.x, fieldWidth },
            });
          }

          if (pos.y < 0 || pos.y > fieldHeight) {
            errors.push({
              type: "warning",
              field: `sets[${setIndex}].positionsByCount[${count}][${memberId}].y`,
              message: `Y座標 ${pos.y.toFixed(2)} がフィールド範囲外です（0-${fieldHeight}）`,
              details: { setId: set.id, memberId, count, y: pos.y, fieldHeight },
            });
          }
        });
      });
    }
  });

  return errors;
}

/**
 * セットデータの基本構造をチェック
 */
export function validateSetStructure(sets: UiSet[]): ValidationError[] {
  const errors: ValidationError[] = [];

  sets.forEach((set, index) => {
    if (!set.id || typeof set.id !== "string") {
      errors.push({
        type: "error",
        field: `sets[${index}].id`,
        message: "セットIDが無効です",
        details: { set, index },
      });
    }

    if (typeof set.startCount !== "number" || isNaN(set.startCount)) {
      errors.push({
        type: "error",
        field: `sets[${index}].startCount`,
        message: "開始カウントが無効です",
        details: { set, index },
      });
    }

    if (!set.positions || typeof set.positions !== "object") {
      errors.push({
        type: "error",
        field: `sets[${index}].positions`,
        message: "positionsが無効です",
        details: { set, index },
      });
    }
  });

  return errors;
}

/**
 * メンバーデータの基本構造をチェック
 */
export function validateMemberStructure(members: Member[]): ValidationError[] {
  const errors: ValidationError[] = [];

  members.forEach((member, index) => {
    if (!member.id || typeof member.id !== "string") {
      errors.push({
        type: "error",
        field: `members[${index}].id`,
        message: "メンバーIDが無効です",
        details: { member, index },
      });
    }

    if (!member.name || typeof member.name !== "string") {
      errors.push({
        type: "warning",
        field: `members[${index}].name`,
        message: "メンバー名が設定されていません",
        details: { member, index },
      });
    }

    if (!member.part || typeof member.part !== "string") {
      errors.push({
        type: "warning",
        field: `members[${index}].part`,
        message: "楽器パートが設定されていません",
        details: { member, index },
      });
    }
  });

  return errors;
}

/**
 * ドリルデータ全体をバリデーション
 */
export function validateDrillData(
  sets: UiSet[],
  members: Member[],
  settings?: Settings
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 基本構造のチェック
  errors.push(...validateSetStructure(sets));
  errors.push(...validateMemberStructure(members));

  // 重複チェック
  errors.push(...validateMemberIds(members));
  warnings.push(...validateSetStartCounts(sets));

  // 座標チェック
  const coordinateIssues = validateCoordinates(sets, members, settings);
  coordinateIssues.forEach((issue) => {
    if (issue.type === "error") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * インポートデータの形式をチェック
 */
export function validateImportData(data: any): {
  valid: boolean;
  error?: string;
  data?: { sets: UiSet[]; members: Member[]; settings?: Settings };
} {
  try {
    // データがオブジェクトかチェック
    if (!data || typeof data !== "object") {
      return {
        valid: false,
        error: "データ形式が無効です。オブジェクトである必要があります。",
      };
    }

    // sets の存在と配列チェック
    if (!data.sets || !Array.isArray(data.sets)) {
      return {
        valid: false,
        error: "データ形式が無効です。'sets' 配列が見つかりません。",
      };
    }

    // members の存在と配列チェック（オプショナル）
    const members = data.members && Array.isArray(data.members) ? data.members : [];

    // バリデーション実行
    const validation = validateDrillData(data.sets, members, data.settings);

    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => e.message).join("; ");
      return {
        valid: false,
        error: `データの検証に失敗しました: ${errorMessages}`,
      };
    }

    return {
      valid: true,
      data: {
        sets: data.sets,
        members,
        settings: data.settings,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `データの解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}


