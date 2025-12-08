// lib/drill/versionCompare.ts
// ドリルバージョン比較ユーティリティ

import type { UiSet } from "./uiTypes";
import type { Member } from "@/context/MembersContext";

export type DrillDiff = {
  sets: {
    added: UiSet[];
    removed: UiSet[];
    modified: {
      set: UiSet;
      changes: {
        field: string;
        oldValue: any;
        newValue: any;
      }[];
    }[];
  };
  members: {
    added: Member[];
    removed: Member[];
    modified: {
      member: Member;
      changes: {
        field: string;
        oldValue: any;
        newValue: any;
      }[];
    }[];
  };
  statistics: {
    totalSetsDiff: number;
    totalMembersDiff: number;
    positionChanges: number;
  };
};

/**
 * 2つのドリルバージョンを比較
 */
export function compareDrillVersions(
  version1: { sets: UiSet[]; members: Member[] },
  version2: { sets: UiSet[]; members: Member[] }
): DrillDiff {
  const sets1 = new Map(version1.sets.map(s => [s.id, s]));
  const sets2 = new Map(version2.sets.map(s => [s.id, s]));
  const members1 = new Map(version1.members.map(m => [m.id, m]));
  const members2 = new Map(version2.members.map(m => [m.id, m]));

  // セットの差分
  const addedSets: UiSet[] = [];
  const removedSets: UiSet[] = [];
  const modifiedSets: DrillDiff["sets"]["modified"] = [];

  version2.sets.forEach(set2 => {
    const set1 = sets1.get(set2.id);
    if (!set1) {
      addedSets.push(set2);
    } else {
      const changes = compareSet(set1, set2);
      if (changes.length > 0) {
        modifiedSets.push({ set: set2, changes });
      }
    }
  });

  version1.sets.forEach(set1 => {
    if (!sets2.has(set1.id)) {
      removedSets.push(set1);
    }
  });

  // メンバーの差分
  const addedMembers: Member[] = [];
  const removedMembers: Member[] = [];
  const modifiedMembers: DrillDiff["members"]["modified"] = [];

  version2.members.forEach(member2 => {
    const member1 = members1.get(member2.id);
    if (!member1) {
      addedMembers.push(member2);
    } else {
      const changes = compareMember(member1, member2);
      if (changes.length > 0) {
        modifiedMembers.push({ member: member2, changes });
      }
    }
  });

  version1.members.forEach(member1 => {
    if (!members2.has(member1.id)) {
      removedMembers.push(member1);
    }
  });

  // 位置変更の数をカウント
  let positionChanges = 0;
  modifiedSets.forEach(({ set, changes }) => {
    positionChanges += changes.filter(c => c.field === "positions" || c.field === "positionsByCount").length;
  });

  return {
    sets: {
      added: addedSets,
      removed: removedSets,
      modified: modifiedSets,
    },
    members: {
      added: addedMembers,
      removed: removedMembers,
      modified: modifiedMembers,
    },
    statistics: {
      totalSetsDiff: addedSets.length + removedSets.length + modifiedSets.length,
      totalMembersDiff: addedMembers.length + removedMembers.length + modifiedMembers.length,
      positionChanges,
    },
  };
}

/**
 * セットを比較
 */
function compareSet(set1: UiSet, set2: UiSet): DrillDiff["sets"]["modified"][0]["changes"] {
  const changes: DrillDiff["sets"]["modified"][0]["changes"] = [];

  if (set1.name !== set2.name) {
    changes.push({ field: "name", oldValue: set1.name, newValue: set2.name });
  }
  if (set1.startCount !== set2.startCount) {
    changes.push({ field: "startCount", oldValue: set1.startCount, newValue: set2.startCount });
  }
  if (JSON.stringify(set1.positions) !== JSON.stringify(set2.positions)) {
    changes.push({ field: "positions", oldValue: set1.positions, newValue: set2.positions });
  }
  if (JSON.stringify(set1.positionsByCount) !== JSON.stringify(set2.positionsByCount)) {
    changes.push({ field: "positionsByCount", oldValue: set1.positionsByCount, newValue: set2.positionsByCount });
  }
  if (set1.note !== set2.note) {
    changes.push({ field: "note", oldValue: set1.note, newValue: set2.note });
  }
  if (set1.instructions !== set2.instructions) {
    changes.push({ field: "instructions", oldValue: set1.instructions, newValue: set2.instructions });
  }
  if (set1.nextMove !== set2.nextMove) {
    changes.push({ field: "nextMove", oldValue: set1.nextMove, newValue: set2.nextMove });
  }

  return changes;
}

/**
 * メンバーを比較
 */
function compareMember(member1: Member, member2: Member): DrillDiff["members"]["modified"][0]["changes"] {
  const changes: DrillDiff["members"]["modified"][0]["changes"] = [];

  if (member1.name !== member2.name) {
    changes.push({ field: "name", oldValue: member1.name, newValue: member2.name });
  }
  if (member1.part !== member2.part) {
    changes.push({ field: "part", oldValue: member1.part, newValue: member2.part });
  }
  if (member1.color !== member2.color) {
    changes.push({ field: "color", oldValue: member1.color, newValue: member2.color });
  }

  return changes;
}

