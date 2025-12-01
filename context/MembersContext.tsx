//context/MembersContext.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  saveMembersToLocalStorage,
  loadMembersFromLocalStorage,
  autoSaveMembers,
} from "@/lib/drill/storage";

export type Member = {
  id: string;
  name: string;
  part: string;
  color?: string;
};

type MembersContextType = {
  members: Member[];
  setMembers: (fnOrValue: ((prev: Member[]) => Member[]) | Member[]) => void;
};

const MembersContext = createContext<MembersContextType | null>(null);

export const MembersProvider = ({ children }: { children: React.ReactNode }) => {
  // ローカルストレージから読み込み（初回のみ）
  const [members, setMembersState] = useState<Member[]>(() => {
    if (typeof window === "undefined") {
      // SSR時は常に空の状態から開始（「白紙のドリル用紙」イメージ）
      return [];
    }
    
    const saved = loadMembersFromLocalStorage();
    // 保存されたデータがなければ完全に空からスタート
    return saved || [];
  });

  const setMembers = (fnOrValue: (prev: Member[]) => Member[] | Member[]) => {
    if (typeof fnOrValue === "function") {
      setMembersState((prev) => fnOrValue(prev));
    } else {
      setMembersState(fnOrValue);
    }
  };

  // 自動保存（メンバーが変更されたら2秒後に保存）
  useEffect(() => {
    if (members.length >= 0) {
      autoSaveMembers(members, 2000);
    }
  }, [members]);

  return (
    <MembersContext.Provider value={{ members, setMembers }}>
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error("useMembers must be used within MembersProvider");
  return ctx;
};
