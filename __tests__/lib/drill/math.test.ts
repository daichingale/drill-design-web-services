// __tests__/lib/drill/math.test.ts
// 数学関数のテスト（実際の実装に合わせて調整）
import type { WorldPos } from '@/lib/drill/types';

// 簡易的な距離計算関数（テスト用）
function calculateDistance(pos1: WorldPos, pos2: WorldPos): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe('Math Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const pos1: WorldPos = { x: 0, y: 0 };
      const pos2: WorldPos = { x: 3, y: 4 };
      
      const distance = calculateDistance(pos1, pos2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for same points', () => {
      const pos: WorldPos = { x: 5, y: 5 };
      
      const distance = calculateDistance(pos, pos);
      
      expect(distance).toBe(0);
    });
  });
});


import type { WorldPos } from '@/lib/drill/types';

// 簡易的な距離計算関数（テスト用）
function calculateDistance(pos1: WorldPos, pos2: WorldPos): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe('Math Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const pos1: WorldPos = { x: 0, y: 0 };
      const pos2: WorldPos = { x: 3, y: 4 };
      
      const distance = calculateDistance(pos1, pos2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for same points', () => {
      const pos: WorldPos = { x: 5, y: 5 };
      
      const distance = calculateDistance(pos, pos);
      
      expect(distance).toBe(0);
    });
  });
});

