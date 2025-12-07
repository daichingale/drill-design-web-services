// hooks/useKeyboardShortcuts.ts
"use client";

import { useEffect, useCallback, useRef } from "react";

export type ShortcutKey = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
};

export type ShortcutAction = () => void;

export type ShortcutDefinition = {
  id: string;
  keys: ShortcutKey;
  action: ShortcutAction;
  description: string;
  category?: string;
};

type UseKeyboardShortcutsOptions = {
  enabled?: boolean;
  shortcuts: ShortcutDefinition[];
};

/**
 * キーボードショートカットを管理するフック
 */
export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // ショートカット定義を更新
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // キーイベントを処理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 入力フィールドやテキストエリアでのショートカットを無効化（一部を除く）
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // event.keyが存在しない場合は処理をスキップ
      if (!event.key) {
        return;
      }

      // 入力フィールドでも有効なショートカット（Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Y, Ctrl+K, Ctrl+G, Ctrl+Plus, Ctrl+Minus）
      const allowedInInput = [
        "a",
        "c",
        "v",
        "z",
        "y",
        "k",
        "g",
        "=",
        "+",
        "-",
      ];
      if (isInput && !allowedInInput.includes(event.key.toLowerCase())) {
        return;
      }

      // 各ショートカットをチェック
      for (const shortcut of shortcutsRef.current) {
        const { keys, action } = shortcut;
        
        // keys.keyが存在しない場合はスキップ
        if (!keys.key) {
          continue;
        }
        
        const ctrlMatch = keys.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = keys.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = keys.alt ? event.altKey : !event.altKey;
        
        // event.keyとevent.codeの両方をチェック（存在する場合のみ）
        const keyMatch =
          event.key.toLowerCase() === keys.key.toLowerCase() ||
          (event.code && event.code.toLowerCase() === keys.key.toLowerCase());

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          event.stopPropagation();
          action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * ショートカットキーを文字列形式に変換
 */
export function formatShortcutKey(keys: ShortcutKey): string {
  const parts: string[] = [];
  if (keys.ctrl || keys.meta) {
    parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Ctrl");
  }
  if (keys.shift) {
    parts.push("Shift");
  }
  if (keys.alt) {
    parts.push("Alt");
  }
  parts.push(keys.key.toUpperCase());
  return parts.join(" + ");
}


