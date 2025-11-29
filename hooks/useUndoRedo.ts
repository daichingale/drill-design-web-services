import { useState, useCallback } from "react";

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // 新しい状態を記録（未来履歴をクリア）
  const push = useCallback((newState: T) => {
    setHistory((prev) => {
      // 状態が変わっていない場合はスキップ
      if (JSON.stringify(prev.present) === JSON.stringify(newState)) {
        return prev;
      }
      return {
        past: [...prev.past, prev.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  // 元に戻す
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // やり直す
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const newPresent = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  return {
    state: history.present,
    push,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}