// components/drill/HeaderMenu.tsx
"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { MenuGroup } from "@/context/MenuContext";

type HeaderMenuProps = {
  groups: MenuGroup[];
};

export default function HeaderMenu({ groups }: HeaderMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [wrappedLabels, setWrappedLabels] = useState<Record<string, boolean>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  // モバイル表示の検出
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 折り返し検出
  useLayoutEffect(() => {
    if (isMobile) {
      // モバイル表示の場合は常にアイコンのみ
      setWrappedLabels({});
      return;
    }

    const checkWrapping = () => {
      const newWrappedLabels: Record<string, boolean> = {};
      
      Object.entries(labelRefs.current).forEach(([label, element]) => {
        if (element && element.offsetWidth > 0) {
          // scrollWidth > offsetWidth の場合、テキストがオーバーフローしている（折り返しまたは切り詰め）
          // または scrollHeight > clientHeight の場合、折り返しが発生している
          const isWrapped = element.scrollWidth > element.offsetWidth || element.scrollHeight > element.clientHeight;
          newWrappedLabels[label] = isWrapped;
        }
      });
      
      // 既存の状態とマージ（要素がまだ存在しない場合は既存の状態を保持）
      setWrappedLabels((prev) => {
        const merged = { ...prev, ...newWrappedLabels };
        return merged;
      });
    };

    // 初回チェック（レンダリング後に実行）
    const timeoutId = setTimeout(checkWrapping, 100);

    // リサイズ時にもチェック
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkWrapping, 50);
    });
    
    // 既存の要素を監視
    const observeElements = () => {
      Object.values(labelRefs.current).forEach((element) => {
        if (element && element.offsetWidth > 0) {
          resizeObserver.observe(element);
        }
      });
    };
    
    observeElements();

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [isMobile, groups]);

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
      {groups.map((group) => {
        // 初期状態では文字を表示（折り返しが検出されるまで）
        // モバイル表示の場合は常にアイコンのみ
        const showIconOnly = isMobile || (wrappedLabels[group.label] === true);
        const hasIcon = !!group.icon;
        
        return (
          <div key={group.label} className="relative" ref={(el) => { menuRefs.current[group.label] = el; }}>
            <button
              onClick={() =>
                setOpenMenu(openMenu === group.label ? null : group.label)
              }
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded flex items-center gap-1.5 ${
                openMenu === group.label
                  ? "text-slate-100 bg-slate-700/50"
                  : "text-slate-300 hover:text-slate-100 hover:bg-slate-700/30"
              }`}
              title={showIconOnly ? group.label : undefined}
            >
              {hasIcon && (
                <span className="text-base shrink-0">{group.icon}</span>
              )}
              {!showIconOnly && (
                <span
                  ref={(el) => { labelRefs.current[group.label] = el; }}
                  className="whitespace-nowrap"
                  style={{ display: 'inline-block' }}
                >
                  {group.label}
                </span>
              )}
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

                // データを全削除の場合は赤字で表示（翻訳キーで判定）
                const isDeleteAction = item.label === "データを全削除" || item.label === "Delete All Data";
                
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
        );
      })}
    </div>
  );
}

