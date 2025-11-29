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
  setMembers: (fn: (prev: Member[]) => Member[]) => void;
};

const MembersContext = createContext<MembersContextType | null>(null);

export const MembersProvider = ({ children }: { children: React.ReactNode }) => {
  // ローカルストレージから読み込み（初回のみ）
  const [members, setMembersState] = useState<Member[]>(() => {
    if (typeof window === "undefined") {
      return [
        { id: "M1", name: "Flute 1", part: "Flute", color: "#3498db" },
        { id: "M2", name: "Trumpet 1", part: "Trumpet", color: "#e74c3c" },
        { id: "M3", name: "Trombone 1", part: "Trombone", color: "#2ecc71" },
      ];
    }
    
    const saved = loadMembersFromLocalStorage();
    return saved || [
      { id: "M1", name: "Flute 1", part: "Flute", color: "#3498db" },
      { id: "M2", name: "Trumpet 1", part: "Trumpet", color: "#e74c3c" },
      { id: "M3", name: "Trombone 1", part: "Trombone", color: "#2ecc71" },
    ];
  });

  const setMembers = (fn: (prev: Member[]) => Member[]) => {
    setMembersState((prev) => fn(prev));
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
