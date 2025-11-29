// components/drill/HeaderMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { MenuGroup } from "@/context/MenuContext";

type HeaderMenuProps = {
  groups: MenuGroup[];
};

export default function HeaderMenu({ groups }: HeaderMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenu) {
        const menuElement = menuRefs.current[openMenu];
        if (menuElement && !menuElement.contains(e.target as Node)) {
          setOpenMenu(null);
        }
      }
    };

    if (openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenu]);

  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openMenu) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [openMenu]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5">
      {groups.map((group) => (
        <div key={group.label} className="relative" ref={(el) => { menuRefs.current[group.label] = el; }}>
          <button
            onClick={() =>
              setOpenMenu(openMenu === group.label ? null : group.label)
            }
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
              openMenu === group.label
                ? "text-slate-100 bg-slate-700/50"
                : "text-slate-300 hover:text-slate-100 hover:bg-slate-700/30"
            }`}
          >
            {group.label}
          </button>

          {openMenu === group.label && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-md shadow-2xl py-1.5 z-50">
              {group.items.map((item, idx) => {
                if (item.divider) {
                  return (
                    <div
                      key={`divider-${idx}`}
                      className="h-px bg-slate-700 my-1 mx-2"
                    />
                  );
                }

                // データを全削除の場合は赤字で表示
                const isDeleteAction = item.label === "データを全削除";
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!item.disabled && item.action) {
                        item.action();
                        setOpenMenu(null);
                      }
                    }}
                    disabled={item.disabled}
                    className={`w-full px-3 py-2 text-left text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-between mx-1 rounded ${
                      isDeleteAction
                        ? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
                        : "text-slate-200 hover:bg-slate-700/50 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon && <span className="text-base w-5 text-center">{item.icon}</span>}
                      {item.label && <span>{item.label}</span>}
                    </div>
                    {item.shortcut && (
                      <kbd className="text-xs text-slate-400 font-mono px-1.5 py-0.5 bg-slate-900/60 rounded border border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

