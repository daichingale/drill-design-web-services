// lib/drillTypes.ts
export type MarcherId = string;
export type SetId = string;

export type Position = {
  x: number; // メートル or ステップ（後で決める）
  y: number;
};

export type Marcher = {
  id: MarcherId;
  name: string;
  part: string;
  color?: string;
};

export type DrillSet = {
  id: SetId;
  name: string;
  countsToNext: number;
  positions: Record<MarcherId, Position>;
};

export type Show = {
  id: string;
  title: string;
  bpm: number;
  marchers: Marcher[];
  sets: DrillSet[];
};
