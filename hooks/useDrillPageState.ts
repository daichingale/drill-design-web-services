// hooks/useDrillPageState.ts
// ドリルページの状態管理を集約するフック

import { useState } from "react";
import type { WorldPos } from "@/lib/drill/types";
import type { Member } from "@/context/MembersContext";
import type { LineEditState, BoxEditState } from "@/types/drillEditor";

/**
 * ドリルページのUI状態
 */
export type DrillPageUIState = {
  isMounted: boolean;
  commandPaletteOpen: boolean;
  is3DPreviewOpen: boolean;
  shortcutHelpOpen: boolean;
  editorHelpOpen: boolean;
  isMetadataDialogOpen: boolean;
  isLayoutModalOpen: boolean;
  confirmedCountsCollapsed: boolean;
  isMobileView: boolean;
  isStoryboardOpen: boolean;
  isVersionCompareOpen: boolean;
  isBranchManagementOpen: boolean;
};

/**
 * ドリルページの編集状態
 */
export type DrillPageEditState = {
  pendingPositions: Record<string, WorldPos> | null;
  lineEditState: LineEditState;
  boxEditState: BoxEditState;
  followLeaderMode: boolean;
};

/**
 * ドリルページのメタデータ状態
 */
export type DrillPageMetadataState = {
  drillTitle: string;
  drillDataName: string;
  drillDbId: string | null;
};

/**
 * ドリルページのフィルター状態
 */
export type DrillPageFilterState = {
  filteredMemberIds: string[];
  filteredSetIds: string[];
};

/**
 * ドリルページの新規メンバー追加状態
 */
export type DrillPageNewMemberState = {
  pendingNewMembers: Member[] | null;
};

/**
 * ドリルページの状態管理フック
 */
export function useDrillPageState() {
  // UI状態
  const [isMounted, setIsMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [is3DPreviewOpen, setIs3DPreviewOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [editorHelpOpen, setEditorHelpOpen] = useState(false);
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [confirmedCountsCollapsed, setConfirmedCountsCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isVersionCompareOpen, setIsVersionCompareOpen] = useState(false);
  const [isBranchManagementOpen, setIsBranchManagementOpen] = useState(false);

  // 編集状態
  const [pendingPositions, setPendingPositions] = useState<Record<string, WorldPos> | null>(null);
  const [lineEditState, setLineEditState] = useState<LineEditState>(null);
  const [boxEditState, setBoxEditState] = useState<BoxEditState>(null);
  const [followLeaderMode, setFollowLeaderMode] = useState(false);

  // メタデータ状態
  const [drillTitle, setDrillTitle] = useState<string>("");
  const [drillDataName, setDrillDataName] = useState<string>("");
  const [drillDbId, setDrillDbId] = useState<string | null>(null);

  // フィルター状態
  const [filteredMemberIds, setFilteredMemberIds] = useState<string[]>([]);
  const [filteredSetIds, setFilteredSetIds] = useState<string[]>([]);

  // 新規メンバー追加状態
  const [pendingNewMembers, setPendingNewMembers] = useState<Member[] | null>(null);

  return {
    // UI状態
    ui: {
      isMounted,
      setIsMounted,
      commandPaletteOpen,
      setCommandPaletteOpen,
      is3DPreviewOpen,
      setIs3DPreviewOpen,
      shortcutHelpOpen,
      setShortcutHelpOpen,
      editorHelpOpen,
      setEditorHelpOpen,
      isMetadataDialogOpen,
      setIsMetadataDialogOpen,
      isLayoutModalOpen,
      setIsLayoutModalOpen,
      confirmedCountsCollapsed,
      setConfirmedCountsCollapsed,
      isMobileView,
      setIsMobileView,
      isStoryboardOpen,
      setIsStoryboardOpen,
      isVersionCompareOpen,
      setIsVersionCompareOpen,
      isBranchManagementOpen,
      setIsBranchManagementOpen,
    },
    // 編集状態
    edit: {
      pendingPositions,
      setPendingPositions,
      lineEditState,
      setLineEditState,
      boxEditState,
      setBoxEditState,
      followLeaderMode,
      setFollowLeaderMode,
    },
    // メタデータ状態
    metadata: {
      drillTitle,
      setDrillTitle,
      drillDataName,
      setDrillDataName,
      drillDbId,
      setDrillDbId,
    },
    // フィルター状態
    filter: {
      filteredMemberIds,
      setFilteredMemberIds,
      filteredSetIds,
      setFilteredSetIds,
    },
    // 新規メンバー追加状態
    newMember: {
      pendingNewMembers,
      setPendingNewMembers,
    },
  };
}


