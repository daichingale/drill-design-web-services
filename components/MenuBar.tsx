// components/MenuBar.tsx
"use client";

import { Suspense } from "react";
import { useMenu } from "@/context/MenuContext";
import HeaderMenu from "@/components/drill/HeaderMenu";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

function MenuBarInner() {
  const { menuGroups, openCommandPalette } = useMenu();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  // 現在のURLからドリルIDを取得
  const drillId = searchParams.get("id");

  // ページ固有のメニューをそのまま使用（「表示」メニューは各ページで定義）
  const allMenuGroups = menuGroups;

  return <HeaderMenu groups={allMenuGroups} />;
}

export default function MenuBar() {
  return (
    <Suspense fallback={<HeaderMenu groups={[]} />}>
      <MenuBarInner />
    </Suspense>
  );
}

