// context/ClipboardContext.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { WorldPos } from "@/lib/drill/types";

type ClipboardData = {
  type: "members";
  positions: Record<string, WorldPos>;
  memberIds: string[];
};

type ClipboardContextType = {
  clipboard: ClipboardData | null;
  copyToClipboard: (data: ClipboardData) => void;
  pasteFromClipboard: () => ClipboardData | null;
  clearClipboard: () => void;
};

const ClipboardContext = createContext<ClipboardContextType | null>(null);

export const ClipboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const copyToClipboard = useCallback((data: ClipboardData) => {
    setClipboard(data);
    // ブラウザのクリップボードにも保存（テキスト形式）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(JSON.stringify(data)).catch(() => {
        // クリップボードへの書き込みに失敗しても続行
      });
    }
  }, []);

  const pasteFromClipboard = useCallback((): ClipboardData | null => {
    return clipboard;
  }, [clipboard]);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  return (
    <ClipboardContext.Provider
      value={{
        clipboard,
        copyToClipboard,
        pasteFromClipboard,
        clearClipboard,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = () => {
  const ctx = useContext(ClipboardContext);
  if (!ctx) throw new Error("useClipboard must be used within ClipboardProvider");
  return ctx;
};


