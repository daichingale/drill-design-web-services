// hooks/useSnapMode.ts
"use client";

import { useState, useCallback } from "react";
import type { WorldPos } from "@/lib/drill/types";
import type { SnapMode } from "@/lib/drill/snapUtils";
import { clampAndSnap as clampAndSnapUtil } from "@/lib/drill/snapUtils";
import { useSettings } from "@/context/SettingsContext";

/**
 * スナップモードとスナップ処理を管理するフック
 */
export function useSnapMode() {
  const [snapMode, setSnapMode] = useState<SnapMode>("whole");
  const { settings } = useSettings();

  const snapWorld = useCallback(
    (pos: WorldPos): WorldPos => {
      return clampAndSnapUtil(pos, snapMode, settings.fieldWidth, settings.fieldHeight);
    },
    [snapMode, settings.fieldWidth, settings.fieldHeight]
  );

  return {
    snapMode,
    setSnapMode,
    snapWorld,
  };
}

