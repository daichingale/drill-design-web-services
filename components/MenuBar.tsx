// components/MenuBar.tsx
"use client";

import { useMenu } from "@/context/MenuContext";
import HeaderMenu from "@/components/drill/HeaderMenu";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MenuBar() {
  const { menuGroups, openCommandPalette } = useMenu();
  const pathname = usePathname();

  // 常に表示する「表示」メニュー
  const viewMenuGroup = {
    label: "表示",
    items: [
      {
        label: "コマンドパレット",
        icon: "🔍",
        shortcut: "Ctrl+K",
        action: () => {
          if (openCommandPalette) {
            openCommandPalette();
          }
        },
      },
      { divider: true },
      {
        label: "ドリルエディタ",
        icon: "🎯",
        action: () => {
          window.location.href = "/drill";
        },
      },
      {
        label: "メンバー管理",
        icon: "👥",
        action: () => {
          window.location.href = "/members";
        },
      },
      {
        label: "設定",
        icon: "⚙️",
        action: () => {
          window.location.href = "/settings";
        },
      },
    ],
  };

  // ページ固有のメニューと「表示」メニューを結合
  const allMenuGroups = [...menuGroups, viewMenuGroup];

  return <HeaderMenu groups={allMenuGroups} />;
}

