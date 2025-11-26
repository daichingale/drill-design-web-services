// lib/drill/types.ts

// フィールド上の座標（メートル単位）
export type WorldPos = {
  x: number;
  y: number;
};

export type MemberId = string;

export type Member = {
  id: MemberId;
  name: string;
  part: string;
  color?: string;
};

// ベジェアークのバインディング（いま FieldCanvas で使っているもの）
export type ArcBinding = {
  setId: string;
  ctrl: WorldPos[]; // [p0, p1, p2]
  params: Record<MemberId, number>; // memberId -> t(0-1)
};

// ドリル全体の型（今後 Supabase とかに保存するとき用）
export type Drill = {
  id: string;
  title: string;
  bpm: number;
  maxCount: number;
  members: Member[];
  // memberId -> count -> WorldPos
  positionsByMember: Record<MemberId, Record<number, WorldPos>>;
};
