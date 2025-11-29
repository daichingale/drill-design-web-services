// components/drill/HeaderMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";

type MenuItem = {
  label?: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

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

  return (
    <div className="flex items-center gap-1">
      {groups.map((group) => (
        <div key={group.label} className="relative" ref={(el) => { menuRefs.current[group.label] = el; }}>
          <button
            onClick={() =>
              setOpenMenu(openMenu === group.label ? null : group.label)
            }
            className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
          >
            {group.label}
          </button>

          {openMenu === group.label && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
              {group.items.map((item, idx) => {
                if (item.divider) {
                  return (
                    <div
                      key={`divider-${idx}`}
                      className="h-px bg-slate-700 my-1"
                    />
                  );
                }

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
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <span>{item.icon}</span>}
                      {item.label && <span>{item.label}</span>}
                    </div>
                    {item.shortcut && (
                      <kbd className="text-xs text-slate-500">
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

