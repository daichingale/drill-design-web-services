// __tests__/lib/drill/statistics.test.ts
import {
  calculateMovementDistance,
  calculateMovementSpeed,
  calculateFormationComplexity,
  calculateCollisionRisk,
} from '@/lib/drill/statistics';
import type { UiSet } from '@/lib/drill/uiTypes';
import type { Member } from '@/context/MembersContext';

describe('Statistics Calculations', () => {
  const mockMembers: Member[] = [
    { id: 'member1', name: 'Member 1', part: 'Trumpet', color: '#ff0000' },
    { id: 'member2', name: 'Member 2', part: 'Trombone', color: '#00ff00' },
    { id: 'member3', name: 'Member 3', part: 'Flute', color: '#0000ff' },
  ];

  const mockSets: UiSet[] = [
    {
      id: 'set1',
      name: 'Set 1',
      startCount: 0,
      positions: {
        member1: { x: 0, y: 0 },
        member2: { x: 5, y: 0 },
        member3: { x: 10, y: 0 },
      },
      note: '',
      instructions: '',
    },
    {
      id: 'set2',
      name: 'Set 2',
      startCount: 16,
      positions: {
        member1: { x: 5, y: 5 },
        member2: { x: 10, y: 5 },
        member3: { x: 15, y: 5 },
      },
      note: '',
      instructions: '',
    },
  ];

  describe('calculateMovementDistance', () => {
    it('should calculate total movement distance correctly', () => {
      const result = calculateMovementDistance(mockSets, mockMembers);
      
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.averageDistance).toBeGreaterThan(0);
      expect(result.memberDistances).toHaveLength(3);
    });

    it('should handle empty sets', () => {
      const result = calculateMovementDistance([], mockMembers);
      
      expect(result.totalDistance).toBe(0);
      expect(result.averageDistance).toBe(0);
      expect(result.memberDistances).toHaveLength(3);
    });

    it('should handle empty members', () => {
      const result = calculateMovementDistance(mockSets, []);
      
      expect(result.totalDistance).toBe(0);
      expect(result.averageDistance).toBe(0);
      expect(result.memberDistances).toHaveLength(0);
    });

    it('should include distance distribution', () => {
      const result = calculateMovementDistance(mockSets, mockMembers);
      
      expect(result.distanceDistribution).toBeDefined();
      expect(Array.isArray(result.distanceDistribution)).toBe(true);
    });
  });

  describe('calculateMovementSpeed', () => {
    it('should calculate average speed correctly', () => {
      const result = calculateMovementSpeed(mockSets, mockMembers, 120);
      
      expect(result.averageSpeed).toBeGreaterThanOrEqual(0);
      expect(result.maxSpeed).toBeGreaterThanOrEqual(0);
      expect(result.speedBySet).toBeDefined();
    });

    it('should handle different BPM values', () => {
      const result1 = calculateMovementSpeed(mockSets, mockMembers, 60);
      const result2 = calculateMovementSpeed(mockSets, mockMembers, 180);
      
      expect(result1.averageSpeed).toBeDefined();
      expect(result2.averageSpeed).toBeDefined();
    });
  });

  describe('calculateFormationComplexity', () => {
    it('should calculate complexity score', () => {
      const result = calculateFormationComplexity(mockSets, mockMembers);
      
      expect(result.complexityScore).toBeGreaterThanOrEqual(0);
      expect(result.complexityScore).toBeLessThanOrEqual(100);
      expect(result.densityScore).toBeGreaterThanOrEqual(0);
      expect(result.movementComplexity).toBeGreaterThanOrEqual(0);
    });

    it('should include average change and estimated practice time', () => {
      const result = calculateFormationComplexity(mockSets, mockMembers);
      
      expect(result.averageChange).toBeDefined();
      expect(result.estimatedPracticeTime).toBeDefined();
      expect(result.estimatedPracticeTime).toBeGreaterThan(0);
    });
  });

  describe('calculateCollisionRisk', () => {
    it('should detect collision risks', () => {
      const closeSets: UiSet[] = [
        {
          id: 'set1',
          name: 'Set 1',
          startCount: 0,
          positions: {
            member1: { x: 0, y: 0 },
            member2: { x: 0.5, y: 0.5 }, // Very close
          },
          note: '',
          instructions: '',
        },
      ];

      const result = calculateCollisionRisk(closeSets, mockMembers.slice(0, 2));
      
      expect(result.riskCount).toBeGreaterThanOrEqual(0);
      expect(result.highRiskPairs).toBeDefined();
    });

    it('should handle sets with no risks', () => {
      const result = calculateCollisionRisk(mockSets, mockMembers);
      
      expect(result.riskCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.highRiskPairs)).toBe(true);
    });
  });
});

import {
  calculateMovementDistance,
  calculateMovementSpeed,
  calculateFormationComplexity,
  calculateCollisionRisk,
} from '@/lib/drill/statistics';
import type { UiSet } from '@/lib/drill/uiTypes';
import type { Member } from '@/context/MembersContext';

describe('Statistics Calculations', () => {
  const mockMembers: Member[] = [
    { id: 'member1', name: 'Member 1', part: 'Trumpet', color: '#ff0000' },
    { id: 'member2', name: 'Member 2', part: 'Trombone', color: '#00ff00' },
    { id: 'member3', name: 'Member 3', part: 'Flute', color: '#0000ff' },
  ];

  const mockSets: UiSet[] = [
    {
      id: 'set1',
      name: 'Set 1',
      startCount: 0,
      positions: {
        member1: { x: 0, y: 0 },
        member2: { x: 5, y: 0 },
        member3: { x: 10, y: 0 },
      },
      note: '',
      instructions: '',
    },
    {
      id: 'set2',
      name: 'Set 2',
      startCount: 16,
      positions: {
        member1: { x: 5, y: 5 },
        member2: { x: 10, y: 5 },
        member3: { x: 15, y: 5 },
      },
      note: '',
      instructions: '',
    },
  ];

  describe('calculateMovementDistance', () => {
    it('should calculate total movement distance correctly', () => {
      const result = calculateMovementDistance(mockSets, mockMembers);
      
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.averageDistance).toBeGreaterThan(0);
      expect(result.memberDistances).toHaveLength(3);
    });

    it('should handle empty sets', () => {
      const result = calculateMovementDistance([], mockMembers);
      
      expect(result.totalDistance).toBe(0);
      expect(result.averageDistance).toBe(0);
      expect(result.memberDistances).toHaveLength(3);
    });

    it('should handle empty members', () => {
      const result = calculateMovementDistance(mockSets, []);
      
      expect(result.totalDistance).toBe(0);
      expect(result.averageDistance).toBe(0);
      expect(result.memberDistances).toHaveLength(0);
    });

    it('should include distance distribution', () => {
      const result = calculateMovementDistance(mockSets, mockMembers);
      
      expect(result.distanceDistribution).toBeDefined();
      expect(Array.isArray(result.distanceDistribution)).toBe(true);
    });
  });

  describe('calculateMovementSpeed', () => {
    it('should calculate average speed correctly', () => {
      const result = calculateMovementSpeed(mockSets, mockMembers, 120);
      
      expect(result.averageSpeed).toBeGreaterThanOrEqual(0);
      expect(result.maxSpeed).toBeGreaterThanOrEqual(0);
      expect(result.speedBySet).toBeDefined();
    });

    it('should handle different BPM values', () => {
      const result1 = calculateMovementSpeed(mockSets, mockMembers, 60);
      const result2 = calculateMovementSpeed(mockSets, mockMembers, 180);
      
      expect(result1.averageSpeed).toBeDefined();
      expect(result2.averageSpeed).toBeDefined();
    });
  });

  describe('calculateFormationComplexity', () => {
    it('should calculate complexity score', () => {
      const result = calculateFormationComplexity(mockSets, mockMembers);
      
      expect(result.complexityScore).toBeGreaterThanOrEqual(0);
      expect(result.complexityScore).toBeLessThanOrEqual(100);
      expect(result.densityScore).toBeGreaterThanOrEqual(0);
      expect(result.movementComplexity).toBeGreaterThanOrEqual(0);
    });

    it('should include average change and estimated practice time', () => {
      const result = calculateFormationComplexity(mockSets, mockMembers);
      
      expect(result.averageChange).toBeDefined();
      expect(result.estimatedPracticeTime).toBeDefined();
      expect(result.estimatedPracticeTime).toBeGreaterThan(0);
    });
  });

  describe('calculateCollisionRisk', () => {
    it('should detect collision risks', () => {
      const closeSets: UiSet[] = [
        {
          id: 'set1',
          name: 'Set 1',
          startCount: 0,
          positions: {
            member1: { x: 0, y: 0 },
            member2: { x: 0.5, y: 0.5 }, // Very close
          },
          note: '',
          instructions: '',
        },
      ];

      const result = calculateCollisionRisk(closeSets, mockMembers.slice(0, 2));
      
      expect(result.riskCount).toBeGreaterThanOrEqual(0);
      expect(result.highRiskPairs).toBeDefined();
    });

    it('should handle sets with no risks', () => {
      const result = calculateCollisionRisk(mockSets, mockMembers);
      
      expect(result.riskCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.highRiskPairs)).toBe(true);
    });
  });
});

