// context/ShortcutContext.tsx
"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ShortcutKey } from "@/hooks/useKeyboardShortcuts";

type CustomShortcut = {
  id: string;
  keys: ShortcutKey;
};

const STORAGE_KEY = "drill-shortcuts";

// デフォルトショートカット定義
const DEFAULT_SHORTCUTS: Record<string, ShortcutKey> = {
  copy: { key: "c", ctrl: true },
  paste: { key: "v", ctrl: true },
  delete: { key: "Delete" },
  backspace: { key: "Backspace" },
  deselectAll: { key: "d", ctrl: true },
  setPrevious: { key: "ArrowLeft", ctrl: true },
  setNext: { key: "ArrowRight", ctrl: true },
  zoomIn: { key: "=", ctrl: true },
  zoomOut: { key: "-", ctrl: true },
  toggleGrid: { key: "g", ctrl: true },
  shortcutHelp: { key: "?", shift: true },
};

type ShortcutContextType = {
  customShortcuts: Record<string, ShortcutKey>;
  setShortcut: (id: string, keys: ShortcutKey) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  getShortcut: (id: string) => ShortcutKey;
  checkConflict: (keys: ShortcutKey, excludeId?: string) => string | null; // 競合するショートカットIDを返す
};

const ShortcutContext = createContext<ShortcutContextType | null>(null);

export const ShortcutProvider = ({ children }: { children: React.ReactNode }) => {
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, ShortcutKey>>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load shortcuts from storage:", error);
    }
    return {};
  });

  // ローカルストレージに保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customShortcuts));
    } catch (error) {
      console.error("Failed to save shortcuts to storage:", error);
    }
  }, [customShortcuts]);

  const setShortcut = useCallback((id: string, keys: ShortcutKey) => {
    setCustomShortcuts((prev) => ({
      ...prev,
      [id]: keys,
    }));
  }, []);

  const resetShortcut = useCallback((id: string) => {
    setCustomShortcuts((prev) => {
      const newShortcuts = { ...prev };
      delete newShortcuts[id];
      return newShortcuts;
    });
  }, []);

  const resetAllShortcuts = useCallback(() => {
    setCustomShortcuts({});
  }, []);

  const getShortcut = useCallback(
    (id: string): ShortcutKey => {
      return customShortcuts[id] || DEFAULT_SHORTCUTS[id] || { key: "" };
    },
    [customShortcuts]
  );

  const checkConflict = useCallback(
    (keys: ShortcutKey, excludeId?: string): string | null => {
      // すべてのショートカット（カスタム + デフォルト）をチェック
      const allShortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };
      
      for (const [id, shortcut] of Object.entries(allShortcuts)) {
        if (excludeId && id === excludeId) continue;
        
        const ctrlMatch = (keys.ctrl || keys.meta) === (shortcut.ctrl || shortcut.meta);
        const shiftMatch = keys.shift === shortcut.shift;
        const altMatch = keys.alt === shortcut.alt;
        const keyMatch = keys.key.toLowerCase() === shortcut.key.toLowerCase();
        
        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          return id;
        }
      }
      
      return null;
    },
    [customShortcuts]
  );

  return (
    <ShortcutContext.Provider
      value={{
        customShortcuts,
        setShortcut,
        resetShortcut,
        resetAllShortcuts,
        getShortcut,
        checkConflict,
      }}
    >
      {children}
    </ShortcutContext.Provider>
  );
};

export const useShortcuts = () => {
  const ctx = useContext(ShortcutContext);
  if (!ctx) throw new Error("useShortcuts must be used within ShortcutProvider");
  return ctx;
};


