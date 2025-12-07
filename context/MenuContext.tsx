// context/MenuContext.tsx
"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

export type MenuItem = {
  label?: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
};

export type MenuGroup = {
  label: string;
  icon?: string; // メニューグループのアイコン（オプショナル）
  items: MenuItem[];
};

type MenuContextType = {
  menuGroups: MenuGroup[];
  setMenuGroups: (groups: MenuGroup[]) => void;
  openCommandPalette: () => void;
  setOpenCommandPalette: (callback: () => void) => void;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const openCommandPaletteRef = useRef<(() => void) | undefined>(undefined);

  const setOpenCommandPalette = useCallback((callback: () => void) => {
    openCommandPaletteRef.current = callback;
  }, []);

  const openCommandPalette = useCallback(() => {
    if (openCommandPaletteRef.current) {
      openCommandPaletteRef.current();
    }
  }, []);

  return (
    <MenuContext.Provider value={{ 
      menuGroups, 
      setMenuGroups,
      openCommandPalette,
      setOpenCommandPalette,
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}

