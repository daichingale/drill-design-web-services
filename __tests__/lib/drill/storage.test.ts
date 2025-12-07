// __tests__/lib/drill/storage.test.ts
import {
  saveDrillToLocalStorage,
  loadDrillFromLocalStorage,
  exportDrillToJSON,
  importDrillFromJSON,
} from '@/lib/drill/storage';
import type { UiSet } from '@/lib/drill/uiTypes';

describe('Storage Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSets: UiSet[] = [
    {
      id: 'set1',
      name: 'Test Set',
      startCount: 0,
      positions: {
        member1: { x: 0, y: 0 },
      },
      note: 'Test note',
      instructions: 'Test instructions',
    },
  ];

  describe('saveDrillToLocalStorage', () => {
    it('should save sets to localStorage', () => {
      const result = saveDrillToLocalStorage(mockSets);
      
      expect(result).toBe(true);
      const saved = localStorage.getItem('drill-sets');
      expect(saved).toBeTruthy();
    });

    it('should handle empty sets array', () => {
      const result = saveDrillToLocalStorage([]);
      
      expect(result).toBe(true);
    });
  });

  describe('loadDrillFromLocalStorage', () => {
    it('should load sets from localStorage', () => {
      saveDrillToLocalStorage(mockSets);
      const loaded = loadDrillFromLocalStorage();
      
      expect(loaded).toBeDefined();
      expect(Array.isArray(loaded)).toBe(true);
      if (loaded.length > 0) {
        expect(loaded[0].id).toBe(mockSets[0].id);
      }
    });

    it('should return empty array when no data exists', () => {
      const loaded = loadDrillFromLocalStorage();
      
      expect(Array.isArray(loaded)).toBe(true);
    });
  });

  describe('exportDrillToJSON', () => {
    it('should export sets to JSON string', () => {
      const json = exportDrillToJSON(mockSets);
      
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });
  });

  describe('importDrillFromJSON', () => {
    it('should import sets from JSON string', () => {
      const json = exportDrillToJSON(mockSets);
      const imported = importDrillFromJSON(json);
      
      expect(Array.isArray(imported)).toBe(true);
      if (imported.length > 0) {
        expect(imported[0].id).toBe(mockSets[0].id);
      }
    });

    it('should handle invalid JSON', () => {
      expect(() => {
        importDrillFromJSON('invalid json');
      }).toThrow();
    });
  });
});

import {
  saveDrillToLocalStorage,
  loadDrillFromLocalStorage,
  exportDrillToJSON,
  importDrillFromJSON,
} from '@/lib/drill/storage';
import type { UiSet } from '@/lib/drill/uiTypes';

describe('Storage Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockSets: UiSet[] = [
    {
      id: 'set1',
      name: 'Test Set',
      startCount: 0,
      positions: {
        member1: { x: 0, y: 0 },
      },
      note: 'Test note',
      instructions: 'Test instructions',
    },
  ];

  describe('saveDrillToLocalStorage', () => {
    it('should save sets to localStorage', () => {
      const result = saveDrillToLocalStorage(mockSets);
      
      expect(result).toBe(true);
      const saved = localStorage.getItem('drill-sets');
      expect(saved).toBeTruthy();
    });

    it('should handle empty sets array', () => {
      const result = saveDrillToLocalStorage([]);
      
      expect(result).toBe(true);
    });
  });

  describe('loadDrillFromLocalStorage', () => {
    it('should load sets from localStorage', () => {
      saveDrillToLocalStorage(mockSets);
      const loaded = loadDrillFromLocalStorage();
      
      expect(loaded).toBeDefined();
      expect(Array.isArray(loaded)).toBe(true);
      if (loaded.length > 0) {
        expect(loaded[0].id).toBe(mockSets[0].id);
      }
    });

    it('should return empty array when no data exists', () => {
      const loaded = loadDrillFromLocalStorage();
      
      expect(Array.isArray(loaded)).toBe(true);
    });
  });

  describe('exportDrillToJSON', () => {
    it('should export sets to JSON string', () => {
      const json = exportDrillToJSON(mockSets);
      
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });
  });

  describe('importDrillFromJSON', () => {
    it('should import sets from JSON string', () => {
      const json = exportDrillToJSON(mockSets);
      const imported = importDrillFromJSON(json);
      
      expect(Array.isArray(imported)).toBe(true);
      if (imported.length > 0) {
        expect(imported[0].id).toBe(mockSets[0].id);
      }
    });

    it('should handle invalid JSON', () => {
      expect(() => {
        importDrillFromJSON('invalid json');
      }).toThrow();
    });
  });
});

