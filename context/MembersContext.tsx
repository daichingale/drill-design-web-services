"use client";

import { createContext, useContext, useState } from "react";

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
  const [members, setMembersState] = useState<Member[]>([
    { id: "M1", name: "Flute 1", part: "Flute", color: "#3498db" },
    { id: "M2", name: "Trumpet 1", part: "Trumpet", color: "#e74c3c" },
    { id: "M3", name: "Trombone 1", part: "Trombone", color: "#2ecc71" },
  ]);

  const setMembers = (fn: (prev: Member[]) => Member[]) => {
    setMembersState((prev) => fn(prev));
  };

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
