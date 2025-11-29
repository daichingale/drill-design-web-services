// hooks/useDrillSets.ts
"use client";

import { useEffect,useCallback,useState } from "react";
import type { WorldPos, Member, ArcBinding } from "@/lib/drill/types";
import type { UiSet } from "@/lib/drill/uiTypes";
import { useSettings } from "@/context/SettingsContext";
import {
  arrangeCircle as arrangeCircleUtil,
  arrangeRectangle as arrangeRectangleUtil,
  arrangeSpiral as arrangeSpiralUtil,
  arrangeBox as arrangeBoxUtil,
  applyShapeToSelected,
  rotateSelected as rotateSelectedUtil,
  scaleSelected as scaleSelectedUtil,
} from "@/lib/drill/shapeUtils";

// 2次ベジェ（ベジェ整列用）
const bezier2 = (p0: WorldPos, p1: WorldPos, p2: WorldPos, t: number) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};

// 並び順に応じて Set 名を「Set 1, Set 2, ...」に振り直す
const renumberSetsByOrder = (sets: UiSet[]): UiSet[] =>
  sets.map((s, idx) => ({ ...s, name: `Set ${idx + 1}` }));

// フィールド内に収める（安全用・最終ガード）
// 注意: この関数はuseDrillSets内で動的に作成される

type UseDrillSetsResult = {
  sets: UiSet[];
  currentSet: UiSet;
  currentSetId: string;
  setCurrentSetId: (id: string) => void;

  selectedIds: string[];
  handleToggleSelect: (id: string, multi: boolean) => void;

  handleSelectBulk: (ids: string[]) => void;   // ★ 追加

  nudgeSelected: (dx: number, dy: number) => void; // ★ 追加
  // ★ WorldPos を直接受け取る
  handleMove: (id: string, pos: WorldPos) => void;

  handleChangeNote: (value: string) => void;
  handleChangeInstructions: (value: string) => void;
  handleChangeSetStartCount: (id: string, value: number) => void;

  arrangeLineSelected: () => void;

  // 形状作成
  arrangeCircle: (center: WorldPos, radius: number) => void;
  arrangeRectangle: (center: WorldPos, width: number, height: number) => void;
  arrangeSpiral: (center: WorldPos, maxRadius: number, turns?: number) => void;
  arrangeBox: (center: WorldPos, width: number, height: number, spacing?: number) => void;
  
  // 変形・回転
  rotateSelected: (center: WorldPos, angle: number) => void;
  scaleSelected: (center: WorldPos, scaleX: number, scaleY?: number) => void;

  arcBinding: ArcBinding | null;
  startBezierArc: () => void;
  clearBezierArc: () => void;
  handleUpdateArcPoint: (index: number, pos: WorldPos) => void;
  handleMoveArcGroup: (dx: number, dy: number) => void;

  addSetTail: () => void;
  addSetAtCount: (count: number) => void;
  deleteSet: (id: string) => void;
  reorderSet: (id: string, direction: 'up' | 'down') => void;
  restoreState: (newSets: UiSet[], newSelectedIds: string[], newCurrentSetId: string) => void;
};

// members: Member[] / clampAndSnap: (WorldPos) => WorldPos を外から注入
export function useDrillSets(
  members: Member[],
  clampAndSnap: (p: WorldPos) => WorldPos
): UseDrillSetsResult {
  const { settings } = useSettings();
  const fieldWidth = settings.fieldWidth;
  const fieldHeight = settings.fieldHeight;

  // フィールド内に収める（安全用・最終ガード）
  const clampPos = useCallback((p: WorldPos): WorldPos => ({
    x: Math.min(Math.max(p.x, 0), fieldWidth),
    y: Math.min(Math.max(p.y, 0), fieldHeight),
  }), [fieldWidth, fieldHeight]);
  const [sets, setSets] = useState<UiSet[]>([
    {
      id: "Set1",
      name: "Set 1",
      startCount: 0,
      positions: {},
      note: "",
      instructions: "",
    },
    {
      id: "Set2",
      name: "Set 2",
      startCount: 16,
      positions: {},
      note: "",
      instructions: "",
    },
  ]);

  const [currentSetId, setCurrentSetId] = useState("Set1");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [arcBinding, setArcBinding] = useState<ArcBinding | null>(null);

  // ★ 状態を一括復元する関数
  const restoreState = useCallback(
    (newSets: UiSet[], newSelectedIds: string[], newCurrentSetId: string) => {
      console.log("[restoreState] 状態を復元", {
        setsCount: newSets.length,
        selectedIdsCount: newSelectedIds.length,
        currentSetId: newCurrentSetId,
        firstSetPositionsKeys: newSets[0]?.positions ? Object.keys(newSets[0].positions) : [],
        membersCount: members.length,
        memberIds: members.map(m => m.id),
      });
      
      // 復元するsetsのpositionsを、現在のmembersに合わせてフィルタリング
      // これにより、現在存在しないメンバーIDの位置情報を削除し、
      // 現在存在するメンバーIDの位置情報のみを保持
      // ただし、既存の位置情報は保持し、新しいメンバーには初期位置を設定しない
      const filteredSets = newSets.map(set => {
        const filteredPositions: Record<string, WorldPos> = {};
        
        // 現在存在するメンバーの位置情報のみを保持
        members.forEach(m => {
          if (set.positions[m.id]) {
            filteredPositions[m.id] = set.positions[m.id];
          }
        });
        
        return {
          ...set,
          positions: filteredPositions,
        };
      });
      
      console.log("[restoreState] フィルタリング後", {
        firstSetPositionsKeys: filteredSets[0]?.positions ? Object.keys(filteredSets[0].positions) : [],
      });
      
      setSets(filteredSets);
      // selectedIdsはフィルタリングするが、Undo/Redoの復元時は選択状態を保持
      const validSelectedIds = newSelectedIds.filter(id => members.some(m => m.id === id));
      setSelectedIds(validSelectedIds);
      setCurrentSetId(newCurrentSetId);
    },
    [members]
  );
  

  const currentSet = sets.find((s) => s.id === currentSetId) ?? sets[0];

  // メンバー追加・削除に応じて円形初期配置
  useEffect(() => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        const newPositions: Record<string, WorldPos> = { ...set.positions };
        const count = members.length;

        const centerX = fieldWidth / 2;
        const centerY = fieldHeight / 2;
        const radius = 5;

        members.forEach((m, i) => {
          if (!newPositions[m.id]) {
            const angle = (i / Math.max(count, 1)) * Math.PI * 2;
            const raw = {
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
            };
            // ★ ホール／ハーフ／自由スナップをここで反映
            newPositions[m.id] = clampAndSnap(raw);
          }
        });

        // 削除されたメンバー → 位置削除
        Object.keys(newPositions).forEach((id) => {
          if (!members.find((m) => m.id === id)) {
            delete newPositions[id];
          }
        });

        return { ...set, positions: newPositions };
      })
    );
  }, [members, clampAndSnap]);

  // ★ ドット移動：WorldPos を直接受け取る
  // hooks/useDrillSets.ts の handleMove を差し替え

const handleMove = (id: string, newPosRaw: WorldPos) => {
    // ★ ここでスナップ & フィールド内に収める
    const newWorld = clampAndSnap(newPosRaw);
  
    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== currentSetId) return set;
  
        const oldPos = set.positions[id];
        if (!oldPos) return set;
  
        const dx = newWorld.x - oldPos.x;
        const dy = newWorld.y - oldPos.y;
  
        const newPositions: Record<string, WorldPos> = { ...set.positions };
  
        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          // 複数選択をまとめて移動
          selectedIds.forEach((selId) => {
            const p = set.positions[selId];
            if (!p) return;
            const moved = { x: p.x + dx, y: p.y + dy };
            newPositions[selId] = clampAndSnap(moved);
          });
        } else {
          newPositions[id] = newWorld;
        }
  
        return { ...set, positions: newPositions };
      })
    );
  };
  

  // セット追加（最後尾）
  const addSetTail = () => {
    let createdId = "";

    setSets((prev) => {
      const newIndex = prev.length + 1;
      const newId = `Set${newIndex}`;
      createdId = newId;

      const duplicated = structuredClone(currentSet.positions);
      const last = prev[prev.length - 1];
      const newStartCount = last ? last.startCount + 16 : 0;

      const newSet: UiSet = {
        id: newId,
        name: "",
        startCount: newStartCount,
        positions: duplicated,
        note: currentSet.note,
        instructions: currentSet.instructions || "",
      };

      const sorted = [...prev, newSet].sort(
        (a, b) => a.startCount - b.startCount
      );

      return renumberSetsByOrder(sorted);
    });

    if (createdId) {
      setCurrentSetId(createdId);
      setSelectedIds([]);
    }
  };

  // タイムライン上の現在カウントに Set 追加
  const addSetAtCount = (count: number) => {
    const rounded = Math.max(0, Math.round(count));
    let createdId = "";
    let conflict = false;

    setSets((prev) => {
      // 重複チェック（最新の prev を見る）
      if (prev.some((s) => s.startCount === rounded)) {
        conflict = true;
        return prev; // 変更なし
      }

      const newId = `Set${prev.length + 1}`;
      createdId = newId;

      // そのカウント以前で一番近い Set をベースにコピー
      let base: UiSet | null = prev[0] ?? null;
      prev.forEach((s) => {
        if (s.startCount <= rounded) {
          base = s;
        }
      });

      const basePositions = base ? structuredClone(base.positions) : {};
      const baseNote = base ? base.note : "";

      const newSet: UiSet = {
        id: newId,
        name: "",
        startCount: rounded,
        positions: basePositions,
        note: baseNote,
        instructions: base?.instructions || "",
      };

      const next = [...prev, newSet].sort(
        (a, b) => a.startCount - b.startCount
      );

      return renumberSetsByOrder(next);
    });

    if (conflict) {
      alert("そのカウントには既に Set が登録されています。");
      return;
    }

    if (createdId) {
      setCurrentSetId(createdId);
      setSelectedIds([]);
    }
  };

  // セットを削除
  const deleteSet = useCallback((id: string) => {
    setSets((prev) => {
      if (prev.length <= 1) {
        alert("最後のセットは削除できません");
        return prev;
      }

      const filtered = prev.filter((s) => s.id !== id);
      const renumbered = renumberSetsByOrder(filtered);

      // 削除されたセットが現在のセットの場合、最初のセットに切り替え
      if (id === currentSetId && renumbered.length > 0) {
        setCurrentSetId(renumbered[0].id);
        setSelectedIds([]);
      }

      return renumbered;
    });
  }, [currentSetId]);

  // セットの順序を変更（startCountを調整）
  const reorderSet = useCallback((id: string, direction: 'up' | 'down') => {
    setSets((prev) => {
      const sorted = [...prev].sort((a, b) => a.startCount - b.startCount);
      const index = sorted.findIndex((s) => s.id === id);
      
      if (index === -1) return prev;

      if (direction === 'up' && index === 0) {
        // 既に最初なので何もしない
        return prev;
      }
      if (direction === 'down' && index === sorted.length - 1) {
        // 既に最後なので何もしない
        return prev;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const targetSet = sorted[targetIndex];
      const currentSet = sorted[index];

      // startCountを交換
      const newSets = prev.map((s) => {
        if (s.id === id) {
          return { ...s, startCount: targetSet.startCount };
        }
        if (s.id === targetSet.id) {
          return { ...s, startCount: currentSet.startCount };
        }
        return s;
      });

      return renumberSetsByOrder(newSets);
    });
  }, []);

  // 選択トグル
  const handleToggleSelect = useCallback((id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi) {
        // 複数選択モード：既に選択されていれば解除、されていなければ追加
        return prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
      } else {
        // 単一選択モード：同じメンバーを再度クリックした場合は選択解除
        if (prev.length === 1 && prev[0] === id) {
          return [];
        }
        // それ以外はそのメンバーのみを選択
        return [id];
      }
    });
  }, []);

// ★ 矩形選択などから一括で置き換える
const handleSelectBulk = (ids: string[]) => {
  setSelectedIds(ids);
};

  const nudgeSelected = (dx: number, dy: number) => {
    if (selectedIds.length === 0) return;

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== currentSetId) return set;

        const newPositions: Record<string, WorldPos> = {
          ...set.positions,
        };

        selectedIds.forEach((id) => {
          const p = set.positions[id];
          if (!p) return;
          const raw = { x: p.x + dx, y: p.y + dy };
          newPositions[id] = clampAndSnap(raw);
        });

        return { ...set, positions: newPositions };
      })
    );
  };


  // Note 編集
  const handleChangeNote = (value: string) => {
    setSets((prev) =>
      prev.map((set) =>
        set.id === currentSetId ? { ...set, note: value } : set
      )
    );
  };

  // Instructions 編集
  const handleChangeInstructions = (value: string) => {
    setSets((prev) =>
      prev.map((set) =>
        set.id === currentSetId ? { ...set, instructions: value } : set
      )
    );
  };

  // Set の startCount 編集（重複は NG）
  const handleChangeSetStartCount = (id: string, value: number) => {
    const rounded = Math.max(0, Math.round(value));
    let conflict = false;

    setSets((prev) => {
      if (prev.some((s) => s.id !== id && s.startCount === rounded)) {
        conflict = true;
        return prev;
      }

      const updated = prev.map((set) =>
        set.id === id ? { ...set, startCount: rounded } : set
      );
      const sorted = [...updated].sort(
        (a, b) => a.startCount - b.startCount
      );

      return renumberSetsByOrder(sorted);
    });

    if (conflict) {
      alert("そのカウントには既に別の Set が登録されています。");
    }
  };

  // 整列系
  const arrangeLineSelected = () => {
    const targetIds =
      selectedIds.length > 0 ? [...selectedIds] : members.map((m) => m.id);
    if (targetIds.length === 0) return;

    const startX = 5;
    const endX = fieldWidth - 5;
    const y = fieldHeight / 2;
    const n = targetIds.length;
    const step = n > 1 ? (endX - startX) / (n - 1) : 0;

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== currentSetId) return set;
        const newPositions = { ...set.positions };
        targetIds.forEach((id, idx) => {
          newPositions[id] = { x: startX + step * idx, y };
        });
        return { ...set, positions: newPositions };
      })
    );
  };

  // ベジェ系
  const startBezierArc = () => {
    if (members.length === 0) return;

    const targetIds =
      selectedIds.length > 0 ? [...selectedIds] : members.map((m) => m.id);
    if (targetIds.length === 0) return;

    const sortedIds = [...targetIds].sort();
    const params: Record<string, number> = {};
    const n = sortedIds.length;
    sortedIds.forEach((id, i) => {
      params[id] = n > 1 ? i / (n - 1) : 0;
    });

    const centerX = fieldWidth / 2;
    const centerY = fieldHeight / 2;
    const p0: WorldPos = { x: centerX - 10, y: centerY };
    const p2: WorldPos = { x: centerX + 10, y: centerY };
    const p1: WorldPos = { x: centerX, y: centerY - 8 };

    const binding: ArcBinding = {
      setId: currentSetId,
      ctrl: [p0, p1, p2],
      params,
    };

    setArcBinding(binding);

    // いきなり適用
    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== binding.setId) return set;
        const newPositions = { ...set.positions };
        Object.entries(binding.params).forEach(([id, t]) => {
          newPositions[id] = bezier2(p0, p1, p2, t);
        });
        return { ...set, positions: newPositions };
      })
    );
  };

  const clearBezierArc = () => setArcBinding(null);

  const handleUpdateArcPoint = (index: number, pos: WorldPos) => {
    if (!arcBinding || arcBinding.setId !== currentSetId) return;
    const newCtrl = [...arcBinding.ctrl];
    newCtrl[index] = pos;
    const newBinding: ArcBinding = { ...arcBinding, ctrl: newCtrl };
    setArcBinding(newBinding);

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== newBinding.setId) return set;
        const newPositions = { ...set.positions };
        Object.entries(newBinding.params).forEach(([id, t]) => {
          newPositions[id] = bezier2(
            newBinding.ctrl[0],
            newBinding.ctrl[1],
            newBinding.ctrl[2],
            t
          );
        });
        return { ...set, positions: newPositions };
      })
    );
  };

  const handleMoveArcGroup = (dx: number, dy: number) => {
    if (!arcBinding || arcBinding.setId !== currentSetId) return;
    const movedCtrl = arcBinding.ctrl.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
    const newBinding: ArcBinding = { ...arcBinding, ctrl: movedCtrl };
    setArcBinding(newBinding);

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== newBinding.setId) return set;
        const newPositions = { ...set.positions };
        Object.entries(newBinding.params).forEach(([id, t]) => {
          newPositions[id] = bezier2(
            newBinding.ctrl[0],
            newBinding.ctrl[1],
            newBinding.ctrl[2],
            t
          );
        });
        return { ...set, positions: newPositions };
      })
    );
  };

  // 形状作成関数（中心が指定されていない場合は選択メンバーの中心を使用）
  const arrangeCircle = useCallback(
    (center: WorldPos, radius: number) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合（x: 0, y: 0）、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      const shapePositions = arrangeCircleUtil(actualCenter, radius, selectedIds.length);
      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          const newPositions = applyShapeToSelected(
            selectedIds,
            shapePositions,
            set.positions
          );
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  const arrangeRectangle = useCallback(
    (center: WorldPos, width: number, height: number) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      const shapePositions = arrangeRectangleUtil(
        actualCenter,
        width,
        height,
        selectedIds.length
      );
      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          const newPositions = applyShapeToSelected(
            selectedIds,
            shapePositions,
            set.positions
          );
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  const arrangeSpiral = useCallback(
    (center: WorldPos, maxRadius: number, turns: number = 2) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      const shapePositions = arrangeSpiralUtil(actualCenter, maxRadius, selectedIds.length, turns);
      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          const newPositions = applyShapeToSelected(
            selectedIds,
            shapePositions,
            set.positions
          );
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  const arrangeBox = useCallback(
    (center: WorldPos, width: number, height: number, spacing: number = 1.5) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      const shapePositions = arrangeBoxUtil(actualCenter, width, height, selectedIds.length, spacing);
      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          const newPositions = applyShapeToSelected(
            selectedIds,
            shapePositions,
            set.positions
          );
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  // 変形・回転関数（中心が指定されていない場合は選択メンバーの中心を使用）
  const rotateSelected = useCallback(
    (center: WorldPos, angle: number) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          // シンプルな2D回転：現在の位置を中心に回転
          const newPositions = rotateSelectedUtil(selectedIds, set.positions, actualCenter, angle);
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  const scaleSelected = useCallback(
    (center: WorldPos, scaleX: number, scaleY?: number) => {
      if (selectedIds.length === 0) {
        alert("メンバーを選択してください");
        return;
      }

      // 中心が指定されていない場合、選択メンバーの中心を計算
      let actualCenter = center;
      if (center.x === 0 && center.y === 0) {
        const currentSet = sets.find((s) => s.id === currentSetId);
        if (currentSet) {
          const selectedPositions = selectedIds
            .map((id) => currentSet.positions[id])
            .filter((p): p is WorldPos => p !== undefined);
          if (selectedPositions.length > 0) {
            actualCenter = {
              x: selectedPositions.reduce((sum, p) => sum + p.x, 0) / selectedPositions.length,
              y: selectedPositions.reduce((sum, p) => sum + p.y, 0) / selectedPositions.length,
            };
          }
        }
      }

      setSets((prev) =>
        prev.map((set) => {
          if (set.id !== currentSetId) return set;
          const newPositions = scaleSelectedUtil(selectedIds, set.positions, actualCenter, scaleX, scaleY);
          // clampAndSnapを適用
          Object.keys(newPositions).forEach((id) => {
            if (selectedIds.includes(id)) {
              newPositions[id] = clampAndSnap(newPositions[id]);
            }
          });
          return { ...set, positions: newPositions };
        })
      );
    },
    [selectedIds, currentSetId, clampAndSnap, sets]
  );

  return {
    sets,
    currentSet,
    currentSetId,
    setCurrentSetId,

    selectedIds,
    handleToggleSelect,
    handleSelectBulk,   // ★ 追加
    nudgeSelected,          // ★ ここ

    handleMove,
    handleChangeNote,
    handleChangeInstructions,
    handleChangeSetStartCount,

    arrangeLineSelected,

    // 形状作成
    arrangeCircle,
    arrangeRectangle,
    arrangeSpiral,
    arrangeBox,

    // 変形・回転
    rotateSelected,
    scaleSelected,

    arcBinding,
    startBezierArc,
    clearBezierArc,
    handleUpdateArcPoint,
    handleMoveArcGroup,

    addSetTail,
    addSetAtCount,
    deleteSet,
    reorderSet,
    restoreState,  // ★ 追加：Undo/Redo用
  };
}
