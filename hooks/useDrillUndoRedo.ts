// hooks/useDrillUndoRedo.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import type { UiSet } from "@/lib/drill/uiTypes";

type EditorState = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
};

type UseDrillUndoRedoParams = {
  sets: UiSet[];
  selectedIds: string[];
  currentSetId: string;
  restoreState: (sets: UiSet[], selectedIds: string[], currentSetId: string) => void;
  loadDrillFromLocalStorage: () => UiSet[] | null;
  autoSaveDrill: (sets: UiSet[], delay: number) => void;
};

/**
 * ドリルエディタのUndo/Redo機能を統合管理するフック
 */
export function useDrillUndoRedo({
  sets,
  selectedIds,
  currentSetId,
  restoreState,
  loadDrillFromLocalStorage,
  autoSaveDrill,
}: UseDrillUndoRedoParams) {
  const undoRedo = useUndoRedo<EditorState>({
    sets,
    selectedIds,
    currentSetId,
  });

  const isRestoringRef = useRef(false);
  const isInitialLoadRef = useRef(false);
  const lastPushedStateRef = useRef<string>("");
  const isUndoRedoActionRef = useRef(false);

  // 状態が変わるたびに履歴に積む（復元中は除外）
  useEffect(() => {
    // 初期読み込み中または復元中はスキップ
    if (isRestoringRef.current || !isInitialLoadRef.current) return;
    
    // Undo/Redoアクションによる変更は履歴に積まない（既に履歴に存在するため）
    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }
    
    const stateStr = JSON.stringify({
      sets,
      selectedIds,
      currentSetId,
    });
    
    // 前回と同じ状態ならスキップ
    if (lastPushedStateRef.current === stateStr) return;
    
    lastPushedStateRef.current = stateStr;
    
    // 少し遅延させて、連続する変更を1つにまとめる
    const timer = setTimeout(() => {
      if (!isRestoringRef.current && !isUndoRedoActionRef.current) {
        undoRedo.push({
          sets,
          selectedIds,
          currentSetId,
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [sets, selectedIds, currentSetId, undoRedo]);

  // Undo/Redo からの復元
  const prevUndoRedoStateRef = useRef<string>("");
  
  useEffect(() => {
    const state = undoRedo.state;
    if (!state || state.sets.length === 0) {
      prevUndoRedoStateRef.current = "";
      return;
    }
    
    const stateStr = JSON.stringify(state);
    
    // 前回と同じ状態ならスキップ（pushによる変更は無視）
    if (prevUndoRedoStateRef.current === stateStr) {
      return;
    }
    
    const currentStateStr = JSON.stringify({
      sets,
      selectedIds,
      currentSetId,
    });
    
    // 現在の状態とundoRedo.stateが異なる場合のみ復元（undo/redoが呼ばれた時）
    if (currentStateStr !== stateStr && !isRestoringRef.current) {
      console.log("[Undo/Redo] 状態を復元します", {
        setsCount: state.sets.length,
        selectedIdsCount: state.selectedIds.length,
        currentSetId: state.currentSetId,
        firstSetPositionsCount: state.sets[0]?.positions ? Object.keys(state.sets[0].positions).length : 0,
      });
      
      isRestoringRef.current = true;
      isUndoRedoActionRef.current = true;
      lastPushedStateRef.current = ""; // リセットして、復元後の状態を履歴に積めるようにする
      
      restoreState(state.sets, state.selectedIds, state.currentSetId);
      prevUndoRedoStateRef.current = stateStr;
      
      // 復元完了後にフラグをリセット
      setTimeout(() => {
        isRestoringRef.current = false;
        console.log("[Undo/Redo] 復元完了");
      }, 50);
    } else {
      // 同じ状態なら、次回の比較用に保存
      prevUndoRedoStateRef.current = stateStr;
    }
  }, [undoRedo.state, sets, selectedIds, currentSetId, restoreState]);

  // ローカルストレージからの読み込み（初回のみ）
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    
    const savedSets = loadDrillFromLocalStorage();
    if (savedSets && savedSets.length > 0) {
      isRestoringRef.current = true;
      lastPushedStateRef.current = "";
      const initialState = {
        sets: savedSets,
        selectedIds: [] as string[],
        currentSetId: savedSets[0]?.id || "",
      };
      
      // 初期状態を履歴に設定
      undoRedo.push(initialState);
      
      restoreState(savedSets, [], savedSets[0]?.id || "");
      setTimeout(() => {
        isRestoringRef.current = false;
        isInitialLoadRef.current = true;
        lastPushedStateRef.current = JSON.stringify(initialState);
      }, 0);
    } else {
      // 初期状態を履歴に設定
      const initialState = {
        sets,
        selectedIds,
        currentSetId,
      };
      undoRedo.push(initialState);
      lastPushedStateRef.current = JSON.stringify(initialState);
      isInitialLoadRef.current = true;
    }
  }, [loadDrillFromLocalStorage, restoreState, undoRedo, sets, selectedIds, currentSetId]);

  // 自動保存
  useEffect(() => {
    if (!isInitialLoadRef.current || isRestoringRef.current) return;
    if (sets.length > 0) {
      autoSaveDrill(sets, 2000);
    }
  }, [sets, autoSaveDrill]);

  // Undo/Redo関数をラップして、フラグを設定
  const handleUndo = useCallback(() => {
    if (undoRedo.canUndo) {
      isUndoRedoActionRef.current = true;
      undoRedo.undo();
    }
  }, [undoRedo]);

  const handleRedo = useCallback(() => {
    if (undoRedo.canRedo) {
      isUndoRedoActionRef.current = true;
      undoRedo.redo();
    }
  }, [undoRedo]);

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    isRestoringRef,
  };
}

