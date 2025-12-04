// lib/drill/storage.ts
// ドリルデータの保存・読み込み用ユーティリティ

import yaml from "js-yaml";
import type { UiSet } from "./uiTypes";
import type { Member } from "./types";
import type { Settings } from "@/context/SettingsContext";

const STORAGE_KEY_DRILL = "drill-design-sets";
const STORAGE_KEY_MEMBERS = "drill-design-members";
const STORAGE_KEY_VERSION = "drill-design-version";
const STORAGE_KEY_DRILL_METADATA = "drill-design-metadata";

const CURRENT_VERSION = "1.0.0";

export type SavedDrillData = {
  version: string;
  sets: UiSet[];
  savedAt: string;
  settings?: Settings; // フィールド設定（後方互換性のためオプショナル）
};

export type DrillMetadata = {
  title: string;
  dataName: string;
  savedAt: string;
};

export type SavedMembersData = {
  version: string;
  members: Member[];
  savedAt: string;
};

// ===== ドリルデータ（Sets）の保存・読み込み =====

export function saveDrillToLocalStorage(sets: UiSet[]): boolean {
  try {
    const data: SavedDrillData = {
      version: CURRENT_VERSION,
      sets,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_DRILL, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save drill data:", error);
    return false;
  }
}

export function loadDrillFromLocalStorage(): UiSet[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DRILL);
    if (!stored) return null;

    const data: SavedDrillData = JSON.parse(stored);
    
    // バージョンチェック（将来の互換性管理用）
    if (data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: stored=${data.version}, current=${CURRENT_VERSION}`
      );
      // 今は警告だけ。将来はマイグレーション処理を追加
    }

    // 既存データとの互換性：instructionsフィールドがない場合は空文字列を設定
    const sets = (data.sets || []).map((set) => ({
      ...set,
      instructions: set.instructions || "",
      nextMove: set.nextMove || "",
    }));

    return sets;
  } catch (error) {
    console.error("Failed to load drill data:", error);
    return null;
  }
}

export function clearDrillFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DRILL);
  } catch (error) {
    console.error("Failed to clear drill data:", error);
  }
}

export function clearMembersFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MEMBERS);
  } catch (error) {
    console.error("Failed to clear members data:", error);
  }
}

// ===== メンバーデータの保存・読み込み =====

export function saveMembersToLocalStorage(members: Member[]): boolean {
  try {
    const data: SavedMembersData = {
      version: CURRENT_VERSION,
      members,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save members data:", error);
    return false;
  }
}

export function loadMembersFromLocalStorage(): Member[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!stored) return null;

    const data: SavedMembersData = JSON.parse(stored);
    
    if (data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: stored=${data.version}, current=${CURRENT_VERSION}`
      );
    }

    return data.members || null;
  } catch (error) {
    console.error("Failed to load members data:", error);
    return null;
  }
}

// ===== JSON エクスポート/インポート =====

export function exportDrillToJSON(sets: UiSet[], settings?: Settings): string {
  const data: SavedDrillData = {
    version: CURRENT_VERSION,
    sets,
    savedAt: new Date().toISOString(),
    settings,
  };
  return JSON.stringify(data, null, 2);
}

export function importDrillFromJSON(jsonString: string): { sets: UiSet[]; settings?: Settings } | null {
  try {
    const data: SavedDrillData = JSON.parse(jsonString);
    
    if (!data.sets || !Array.isArray(data.sets)) {
      throw new Error("Invalid data format: sets array not found");
    }

    // バージョンチェック
    if (data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: imported=${data.version}, current=${CURRENT_VERSION}`
      );
    }

    // 既存データとの互換性：instructionsフィールドがない場合は空文字列を設定
    const sets = (data.sets || []).map((set) => ({
      ...set,
      instructions: set.instructions || "",
      nextMove: set.nextMove || "",
    }));

    return { sets, settings: data.settings };
  } catch (error) {
    console.error("Failed to import drill data:", error);
    return null;
  }
}

export function exportMembersToJSON(members: Member[]): string {
  const data: SavedMembersData = {
    version: CURRENT_VERSION,
    members,
    savedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importMembersFromJSON(jsonString: string): Member[] | null {
  try {
    const data: SavedMembersData = JSON.parse(jsonString);
    
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error("Invalid data format: members array not found");
    }

    if (data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: imported=${data.version}, current=${CURRENT_VERSION}`
      );
    }

    return data.members;
  } catch (error) {
    console.error("Failed to import members data:", error);
    return null;
  }
}

// ===== YAML エクスポート/インポート =====

export function exportDrillToYAML(sets: UiSet[], settings?: Settings): string {
  const data: SavedDrillData = {
    version: CURRENT_VERSION,
    sets,
    savedAt: new Date().toISOString(),
    settings,
  };
  
  // YAML形式で出力（コメント付き）
  const yamlString = yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
  });
  
  // ヘッダーコメントを追加
  return `# Drill Design Web Services - Drill Data Export
# Version: ${CURRENT_VERSION}
# Exported: ${new Date().toISOString()}
# 
# This file contains drill set data in YAML format.
# You can edit this file manually if needed.
#
${yamlString}`;
}

export function importDrillFromYAML(yamlString: string): { sets: UiSet[]; settings?: Settings } | null {
  try {
    // YAMLをパース
    const data = yaml.load(yamlString) as SavedDrillData;
    
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid YAML format");
    }
    
    if (!data.sets || !Array.isArray(data.sets)) {
      throw new Error("Invalid data format: sets array not found");
    }

    // バージョンチェック
    if (data.version && data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: imported=${data.version}, current=${CURRENT_VERSION}`
      );
    }

    // 既存データとの互換性：instructionsフィールドがない場合は空文字列を設定
    const sets = (data.sets || []).map((set) => ({
      ...set,
      instructions: set.instructions || "",
      nextMove: set.nextMove || "",
    }));

    return { sets, settings: data.settings };
  } catch (error) {
    console.error("Failed to import drill data from YAML:", error);
    return null;
  }
}

export function exportMembersToYAML(members: Member[]): string {
  const data: SavedMembersData = {
    version: CURRENT_VERSION,
    members,
    savedAt: new Date().toISOString(),
  };
  
  const yamlString = yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
  });
  
  return `# Drill Design Web Services - Members Data Export
# Version: ${CURRENT_VERSION}
# Exported: ${new Date().toISOString()}
# 
# This file contains member data in YAML format.
#
${yamlString}`;
}

export function importMembersFromYAML(yamlString: string): Member[] | null {
  try {
    const data = yaml.load(yamlString) as SavedMembersData;
    
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid YAML format");
    }
    
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error("Invalid data format: members array not found");
    }

    if (data.version && data.version !== CURRENT_VERSION) {
      console.warn(
        `Version mismatch: imported=${data.version}, current=${CURRENT_VERSION}`
      );
    }

    return data.members;
  } catch (error) {
    console.error("Failed to import members data from YAML:", error);
    return null;
  }
}

// ===== 自動保存用（デバウンス付き） =====

let autoSaveTimer: NodeJS.Timeout | null = null;

export function autoSaveDrill(
  sets: UiSet[],
  delayMs: number = 2000
): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveDrillToLocalStorage(sets);
    console.log("Auto-saved drill data");
  }, delayMs);
}

export function autoSaveMembers(
  members: Member[],
  delayMs: number = 2000
): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveMembersToLocalStorage(members);
    console.log("Auto-saved members data");
  }, delayMs);
}

// ===== ドリルメタデータ（タイトル・データ名）の保存・読み込み =====

export function saveDrillMetadata(metadata: { title: string; dataName: string }): boolean {
  try {
    const data: DrillMetadata = {
      title: metadata.title,
      dataName: metadata.dataName,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_DRILL_METADATA, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save drill metadata:", error);
    return false;
  }
}

export function loadDrillMetadata(): DrillMetadata | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DRILL_METADATA);
    if (!stored) return null;

    const data: DrillMetadata = JSON.parse(stored);
    return data;
  } catch (error) {
    console.error("Failed to load drill metadata:", error);
    return null;
  }
}

export function clearDrillMetadata(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DRILL_METADATA);
  } catch (error) {
    console.error("Failed to clear drill metadata:", error);
  }
}


