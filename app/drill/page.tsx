// app/drill/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useMembers } from "@/context/MembersContext";
import FieldCanvas, { ArcBinding } from "../../components/drill/FieldCanvas";
import DrillControls from "../../components/drill/DrillControls";

// ===== フィールド設定（FieldCanvas と揃える） =====
const FIELD_WIDTH_M = 40;
const FIELD_HEIGHT_M = 30;

const CANVAS_WIDTH_PX = 800;
const CANVAS_HEIGHT_PX = 600;

const scaleX = CANVAS_WIDTH_PX / FIELD_WIDTH_M;
const scaleY = CANVAS_HEIGHT_PX / FIELD_HEIGHT_M;

const canvasToWorld = (x: number, y: number) => ({
  x: x / scaleX,
  y: y / scaleY,
});

// 補間
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const interpolatePos = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) => ({
  x: lerp(p1.x, p2.x, t),
  y: lerp(p1.y, p2.y, t),
});

// 2次ベジェ
const bezier2 = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};

export default function DrillPage() {
  const { members } = useMembers();

  // ===== セット管理 =====
  const [sets, setSets] = useState([
    {
      id: "Set1",
      name: "Set 1",
      countsToNext: 16,
      positions: {} as Record<string, { x: number; y: number }>,
    },
    {
      id: "Set2",
      name: "Set 2",
      countsToNext: 16,
      positions: {} as Record<string, { x: number; y: number }>,
    },
  ]);

  const [currentSetId, setCurrentSetId] = useState("Set1");

  // ★ 複数選択
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentSet = sets.find((s) => s.id === currentSetId)!;

  // 再生範囲（開始 / 終了セット）
  const [playStartId, setPlayStartId] = useState("Set1");
  const [playEndId, setPlayEndId] = useState("Set2");

  // ===== メンバー追加・削除に対応：円形初期配置 =====
  useEffect(() => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        const newPositions = { ...set.positions };
        const count = members.length;

        const centerX = FIELD_WIDTH_M / 2;
        const centerY = FIELD_HEIGHT_M / 2;
        const radius = 5;

        members.forEach((m, i) => {
          if (!newPositions[m.id]) {
            const angle = (i / Math.max(count, 1)) * Math.PI * 2;
            newPositions[m.id] = {
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
            };
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
  }, [members]);

  // ===== ドラッグで移動 =====
  // ※ 複数選択中に1人をドラッグすると、選択メンバー全員を同じだけ動かす
  const handleMove = (id: string, xPx: number, yPx: number) => {
    const newWorld = canvasToWorld(xPx, yPx);

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== currentSetId) return set;

        const oldPos = set.positions[id];
        if (!oldPos) return set;

        const dx = newWorld.x - oldPos.x;
        const dy = newWorld.y - oldPos.y;

        const newPositions = { ...set.positions };

        // 複数選択 & その中の1人をドラッグ → 全員まとめて移動
        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          selectedIds.forEach((selId) => {
            const p = set.positions[selId];
            if (!p) return;
            newPositions[selId] = { x: p.x + dx, y: p.y + dy };
          });
        } else {
          // 単独 or 非選択 → その人だけ移動
          newPositions[id] = newWorld;
        }

        return { ...set, positions: newPositions };
      })
    );
  };

  // ===== セット追加 =====
  const addSet = () => {
    const newIndex = sets.length + 1;
    const newId = `Set${newIndex}`;

    const duplicated = structuredClone(currentSet.positions);

    const newSet = {
      id: newId,
      name: `Set ${newIndex}`,
      countsToNext: 16,
      positions: duplicated,
    };

    setSets((prev) => [...prev, newSet]);
    setCurrentSetId(newId);
    setPlayEndId(newId);
    setSelectedIds([]);
  };

  // ★ 選択トグル（Ctrl / Cmd で複数選択）
  const handleToggleSelect = (id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi) {
        return prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
      } else {
        if (prev.length === 1 && prev[0] === id) return [];
        return [id];
      }
    });
  };

  // ======== ★ 連続アニメーション用の状態 ========
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentT, setSegmentT] = useState(0);

  const playRef = useRef<{
    isPlaying: boolean;
    startIndex: number;
    endIndex: number;
    segmentIndex: number;
    lastTimestamp: number;
  }>({
    isPlaying: false,
    startIndex: 0,
    endIndex: 0,
    segmentIndex: 0,
    lastTimestamp: 0,
  });

  // ===== ベジェアークバインディング =====
  const [arcBinding, setArcBinding] = useState<ArcBinding | null>(null);

  // ★ ベジェに従って対象メンバーだけ位置更新
  const applyArcBinding = (binding: ArcBinding) => {
    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== binding.setId) return set;
        const newPositions = { ...set.positions };

        Object.entries(binding.params).forEach(([id, t]) => {
          const p = bezier2(
            binding.ctrl[0],
            binding.ctrl[1],
            binding.ctrl[2],
            t
          );
          newPositions[id] = p;
        });

        return { ...set, positions: newPositions };
      })
    );
  };

  // ===== アニメーションループ =====
  useEffect(() => {
    if (!isPlaying) return;

    const durationMs = 2000;

    playRef.current.isPlaying = true;
    playRef.current.lastTimestamp = 0;

    const step = (now: number) => {
      if (!playRef.current.isPlaying) return;

      if (!playRef.current.lastTimestamp) {
        playRef.current.lastTimestamp = now;
      }

      const elapsed = now - playRef.current.lastTimestamp;
      let t = elapsed / durationMs;

      if (t >= 1) {
        t = 1;
        setSegmentT(t);

        const { startIndex, segmentIndex, endIndex } = playRef.current;
        const globalToIndex = startIndex + segmentIndex + 1;

        if (globalToIndex >= endIndex) {
          playRef.current.isPlaying = false;
          setIsPlaying(false);
          setSegmentT(1);
          setCurrentSetId(sets[endIndex].id);
          return;
        } else {
          playRef.current.segmentIndex += 1;
          playRef.current.lastTimestamp = now;
          setSegmentT(0);
        }
      } else {
        setSegmentT(t);
      }

      requestAnimationFrame(step);
    };

    const id = requestAnimationFrame(step);

    return () => {
      playRef.current.isPlaying = false;
      playRef.current.lastTimestamp = 0;
      cancelAnimationFrame(id);
    };
  }, [isPlaying, sets]);

  // ===== 再生開始 / 停止 =====
  const startPlay = () => {
    if (sets.length < 2) {
      alert("アニメーションには最低2セット必要です");
      return;
    }

    const startIndex = sets.findIndex((s) => s.id === playStartId);
    const endIndex = sets.findIndex((s) => s.id === playEndId);

    if (startIndex === -1 || endIndex === -1) {
      alert("開始セット・終了セットの指定が不正です");
      return;
    }
    if (startIndex >= endIndex) {
      alert("開始セットは終了セットより前にしてください");
      return;
    }

    playRef.current = {
      isPlaying: true,
      startIndex,
      endIndex,
      segmentIndex: 0,
      lastTimestamp: 0,
    };

    setCurrentSetId(sets[startIndex].id);
    setSegmentT(0);
    setIsPlaying(true);
  };

  const stopPlay = () => {
    playRef.current.isPlaying = false;
    playRef.current.lastTimestamp = 0;
    setIsPlaying(false);
    setSegmentT(0);
  };

  // ★ 横ライン整列（選択メンバー対象）
  const arrangeLineSelected = () => {
    const targetIds =
      selectedIds.length > 0 ? [...selectedIds] : members.map((m) => m.id);
    if (targetIds.length === 0) return;

    const startX = 5;
    const endX = FIELD_WIDTH_M - 5;
    const y = FIELD_HEIGHT_M / 2;
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

  // ★ ベジェアーク整列（選択メンバー対象）
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

    const centerX = FIELD_WIDTH_M / 2;
    const centerY = FIELD_HEIGHT_M / 2;
    const p0 = { x: centerX - 10, y: centerY };
    const p2 = { x: centerX + 10, y: centerY };
    const p1 = { x: centerX, y: centerY - 8 };

    const binding: ArcBinding = {
      setId: currentSetId,
      ctrl: [p0, p1, p2],
      params,
    };

    setArcBinding(binding);
    applyArcBinding(binding);
  };

  const clearBezierArc = () => {
    setArcBinding(null);
  };

  // ===== ベジェポイント更新 / グループ移動 =====
  const handleUpdateArcPoint = (index: number, pos: { x: number; y: number }) => {
    if (!arcBinding || arcBinding.setId !== currentSetId) return;
    const newCtrl = [...arcBinding.ctrl];
    newCtrl[index] = pos;
    const newBinding: ArcBinding = { ...arcBinding, ctrl: newCtrl };
    setArcBinding(newBinding);
    applyArcBinding(newBinding);
  };

  const handleMoveArcGroup = (dx: number, dy: number) => {
    if (!arcBinding || arcBinding.setId !== currentSetId) return;
    const movedCtrl = arcBinding.ctrl.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
    const newBinding: ArcBinding = { ...arcBinding, ctrl: movedCtrl };
    setArcBinding(newBinding);
    applyArcBinding(newBinding);
  };

  // ===== 再生中の表示 positions =====
  const displayPositions: Record<string, { x: number; y: number }> = (() => {
    if (!isPlaying) {
      return currentSet.positions;
    }

    const { startIndex, segmentIndex } = playRef.current;
    const fromSet = sets[startIndex + segmentIndex];
    const toSet = sets[startIndex + segmentIndex + 1];

    const res: Record<string, { x: number; y: number }> = {};
    members.forEach((m) => {
      const p1 = fromSet.positions[m.id];
      const p2 = toSet.positions[m.id];
      if (p1 && p2) {
        res[m.id] = interpolatePos(p1, p2, segmentT);
      }
    });
    return res;
  })();

  const activeArc =
    arcBinding && arcBinding.setId === currentSetId ? arcBinding : null;

  const singleSelectedId =
    selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <div className="flex gap-6">
      {/* ===== 左：エディタ ===== */}
      <div>
        <h1 className="text-xl font-bold mb-2">
          ドリルエディタ（連続再生＋ベジェアーク）
        </h1>

        <DrillControls
          sets={sets.map((s) => ({ id: s.id, name: s.name }))}
          currentSetId={currentSetId}
          onChangeCurrentSet={(id) => {
            setCurrentSetId(id);
            setSelectedIds([]);
          }}
          onAddSet={addSet}
          playStartId={playStartId}
          playEndId={playEndId}
          onChangePlayStart={setPlayStartId}
          onChangePlayEnd={setPlayEndId}
          onStartPlay={startPlay}
          onStopPlay={stopPlay}
          onArrangeLineSelected={arrangeLineSelected}
          onStartBezierArc={startBezierArc}
          onClearBezierArc={clearBezierArc}
          isPlaying={isPlaying}
          bezierActive={!!activeArc}
        />

        <FieldCanvas
          members={members as any}
          displayPositions={displayPositions}
          currentSetPositions={currentSet.positions}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          isPlaying={isPlaying}
          activeArc={activeArc}
          onMoveMember={handleMove}
          onUpdateArcPoint={handleUpdateArcPoint}
          onMoveArcGroup={handleMoveArcGroup}
        />
      </div>

      {/* ===== 右：情報パネル ===== */}
      <div className="min-w-[220px] border rounded p-3 bg-white">
        <h2 className="font-bold mb-2">選択中のメンバー</h2>

        {singleSelectedId ? (
          (() => {
            const member = members.find((m) => m.id === singleSelectedId)!;
            const pos = currentSet.positions[singleSelectedId];
            return (
              <div className="text-sm space-y-1">
                <p>
                  <b>ID：</b>
                  {member.id}
                </p>
                <p>
                  <b>名前：</b>
                  {member.name}
                </p>
                <p>
                  <b>パート：</b>
                  {member.part}
                </p>
                <p>
                  <b>座標：</b>
                  x={pos.x.toFixed(2)} / y={pos.y.toFixed(2)}
                </p>
              </div>
            );
          })()
        ) : selectedIds.length > 1 ? (
          <div className="text-sm">
            <p>{selectedIds.length}人選択中</p>
            <ul className="mt-1 list-disc list-inside text-xs text-gray-700 max-h-40 overflow-auto">
              {selectedIds.map((id) => {
                const m = members.find((mm) => mm.id === id);
                if (!m) return null;
                return (
                  <li key={id}>
                    {m.id}：{m.name}（{m.part}）
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            ドットをクリックしてください。（Ctrl+クリックで複数選択）
          </p>
        )}
      </div>
    </div>
  );
}
