// app/drill/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useMembers } from "@/context/MembersContext";

import FieldCanvas from "../../components/drill/FieldCanvas";
import DrillControls from "../../components/drill/DrillControls";
import DrillSidePanel from "../../components/drill/DrillSidePanel";
import Drill3DPreview from "../../components/drill/Drill3DPreview";
import NotePanel from "../../components/drill/NotePanel";
import Timeline from "../../components/drill/Timeline";

import { DrillEngine } from "../../lib/drill/engine";
import type {
  Drill,
  WorldPos,
  ArcBinding,
  Member as DrillMember,
} from "../../lib/drill/types";
import { FIELD_WIDTH_M, FIELD_HEIGHT_M } from "../../lib/drill/utils";

// ===== キャンバス⇔ワールド変換（FieldCanvas と揃える） =====
const CANVAS_WIDTH_PX = 800;
const CANVAS_HEIGHT_PX =
  (FIELD_HEIGHT_M / FIELD_WIDTH_M) * CANVAS_WIDTH_PX;

const scaleX = CANVAS_WIDTH_PX / FIELD_WIDTH_M;
const scaleY = CANVAS_HEIGHT_PX / FIELD_HEIGHT_M;

const canvasToWorld = (x: number, y: number): WorldPos => ({
  x: x / scaleX,
  y: y / scaleY,
});

// 2次ベジェ ------------------------------
const bezier2 = (p0: WorldPos, p1: WorldPos, p2: WorldPos, t: number) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};

// UI側の Set 型（Pyware 式：絶対カウントを持つ） ---------
type UiSet = {
  id: string;
  name: string;
  startCount: number; // この Set は何カウント目の形か
  positions: Record<string, WorldPos>;
  note: string;
};

// 並び順に応じて Set 名を「Set 1, Set 2, ...」に振り直す
function renumberSetsByOrder(sets: UiSet[]): UiSet[] {
  return sets.map((s, idx) => ({
    ...s,
    name: `Set ${idx + 1}`,
  }));
}


// Sets + members から Drill と「各セットの開始カウント」を生成
function buildDrillFromSets(
  sets: UiSet[],
  members: { id: string; name: string; part: string; color?: string }[]
): { drill: Drill; countBySetId: Record<string, number> } {
  const drillMembers: DrillMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    part: m.part,
    color: m.color,
  }));

  const positionsByMember: Record<string, Record<number, WorldPos>> = {};
  const countBySetId: Record<string, number> = {};

  // startCount 昇順にソート
  const sorted = [...sets].sort((a, b) => a.startCount - b.startCount);

  let maxCount = 0;

  sorted.forEach((set) => {
    const count = Math.max(0, Math.round(set.startCount));
    countBySetId[set.id] = count;

    drillMembers.forEach((m) => {
      const p = set.positions[m.id];
      if (!p) return;
      if (!positionsByMember[m.id]) {
        positionsByMember[m.id] = {};
      }
      positionsByMember[m.id][count] = { x: p.x, y: p.y };
    });

    if (count > maxCount) maxCount = count;
  });

  const drill: Drill = {
    id: "from-sets",
    title: "From UI Sets",
    bpm: 144,
    maxCount: maxCount + 16, // ラストから16カウント余白
    members: drillMembers,
    positionsByMember,
  };

  return { drill, countBySetId };
}

export default function DrillPage() {
// 現在のカウント位置に Set を追加（タイムライン用）
const addSetAtCount = (count: number) => {
  const rounded = Math.max(0, Math.round(count));
  let createdId = "";
  let conflict = false;

  setSets((prev) => {
    // 最新状態で重複チェック
    if (prev.some((s) => s.startCount === rounded)) {
      conflict = true;
      return prev; // 変更しない
    }

    const newId = `Set${prev.length + 1}`;
    createdId = newId;

    // 一番近い「過去の Set」をベースにコピー（無ければ最初の Set）
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
    setPlayEndId(createdId);
    setSelectedIds([]);
  }
};


  const { members } = useMembers();

  const [currentCount, setCurrentCount] = useState(0);

  // ===== ズーム（FieldCanvas用） =====
  const [canvasScale, setCanvasScale] = useState(1);
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.5;

  const handleZoomIn = () => {
    setCanvasScale((prev) => Math.min(prev * 1.2, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setCanvasScale((prev) => Math.max(prev / 1.2, MIN_SCALE));
  };

  const handleZoomReset = () => {
    setCanvasScale(1);
  };

  // ===== セット管理 =====
  const [sets, setSets] = useState<UiSet[]>([
    {
      id: "Set1",
      name: "Set 1",
      startCount: 0,
      positions: {},
      note: "",
    },
    {
      id: "Set2",
      name: "Set 2",
      startCount: 16,
      positions: {},
      note: "",
    },
  ]);
  const [currentSetId, setCurrentSetId] = useState("Set1");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentSet =
    sets.find((s) => s.id === currentSetId) ?? sets[0];

  // 再生範囲（開始 / 終了セット）
  const [playStartId, setPlayStartId] = useState("Set1");
  const [playEndId, setPlayEndId] = useState("Set2");

  // ===== ドリルエンジン関連 =====
  const engineRef = useRef<DrillEngine | null>(null);
  const countBySetRef = useRef<Record<string, number>>({});
  const playRangeRef = useRef<{ startCount: number; endCount: number } | null>(
    null
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPositions, setPlaybackPositions] = useState<
    Record<string, WorldPos>
  >({});

  // Sets / Members が変わるたびに Drill を再構築してエンジンに渡す
  useEffect(() => {
    if (members.length === 0 || sets.length === 0) return;
    const { drill, countBySetId } = buildDrillFromSets(sets, members);
    countBySetRef.current = countBySetId;

    if (!engineRef.current) {
      engineRef.current = new DrillEngine(drill, 16); // 1秒16カウント
    } else {
      engineRef.current.setDrill(drill);
    }
  }, [sets, members]);

  // ===== メンバー追加・削除に対応：円形初期配置 =====
  useEffect(() => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        const newPositions: Record<string, WorldPos> = { ...set.positions };
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

  // ===== スクラブ（タイムラインをドラッグした時） =====
  const handleScrub = (count: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setCount(count);
    const positions = engine.getCurrentPositionsMap();

    setIsPlaying(false);
    setCurrentCount(count);
    setPlaybackPositions(positions);
  };

  // フィールド内に収めるヘルパー
  const clampPos = (p: WorldPos): WorldPos => ({
    x: Math.min(Math.max(p.x, 0), FIELD_WIDTH_M),
    y: Math.min(Math.max(p.y, 0), FIELD_HEIGHT_M),
  });

  const handleMove = (id: string, xPx: number, yPx: number) => {
    const rawWorld = canvasToWorld(xPx, yPx);
    const newWorld = clampPos(rawWorld);

    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== currentSetId) return set;

        const oldPos = set.positions[id];
        if (!oldPos) return set;

        const dx = newWorld.x - oldPos.x;
        const dy = newWorld.y - oldPos.y;

        const newPositions: Record<string, WorldPos> = { ...set.positions };

        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          selectedIds.forEach((selId) => {
            const p = set.positions[selId];
            if (!p) return;
            const moved = { x: p.x + dx, y: p.y + dy };
            newPositions[selId] = clampPos(moved);
          });
        } else {
          newPositions[id] = newWorld;
        }

        return { ...set, positions: newPositions };
      })
    );
  };

  // ===== セット追加（最後尾に追加） =====
const addSet = () => {
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
      name: "", // 後で振り直す
      startCount: newStartCount,
      positions: duplicated,
      note: currentSet.note,
    };

    const sorted = [...prev, newSet].sort(
      (a, b) => a.startCount - b.startCount
    );

    return renumberSetsByOrder(sorted);
  });

  if (createdId) {
    setCurrentSetId(createdId);
    setPlayEndId(createdId);
    setSelectedIds([]);
  }
};


  // 選択トグル
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

  // Note 編集
  const handleChangeNote = (value: string) => {
    setSets((prev) =>
      prev.map((set) =>
        set.id === currentSetId ? { ...set, note: value } : set
      )
    );
  };

  // Set の startCount 編集
  const handleChangeSetStartCount = (id: string, value: number) => {
    const rounded = Math.max(0, Math.round(value));
    
    // 他の Set とカブらないかチェック
  if (sets.some((s) => s.id !== id && s.startCount === rounded)) {
    alert("そのカウントには既に別の Set が登録されています。");
    return;
  }

  setSets((prev) => {
    const updated = prev.map((set) =>
      set.id === id ? { ...set, startCount: rounded } : set
    );
    const sorted = [...updated].sort(
      (a, b) => a.startCount - b.startCount
    );

    return renumberSetsByOrder(sorted);
  });
  };

  // ===== ベジェアークバインディング =====
  const [arcBinding, setArcBinding] = useState<ArcBinding | null>(null);

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

  // ===== ドリルエンジンのアニメーションループ =====
  useEffect(() => {
    let frameId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const engine = engineRef.current;

      if (engine && isPlaying) {
        engine.update(dt);
        const positions = engine.getCurrentPositionsMap();
        setPlaybackPositions(positions);
        setCurrentCount(engine.currentCount);

        const range = playRangeRef.current;
        if (range && engine.currentCount >= range.endCount) {
          engine.pause();
          setIsPlaying(false);
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  // ===== 再生開始 / 停止 =====
  const startPlay = () => {
    const engine = engineRef.current;
    if (!engine) {
      alert("ドリルデータがまだ準備できていません");
      return;
    }
    if (sets.length < 2) {
      alert("アニメーションには最低2セット必要です");
      return;
    }

    const countBySetId = countBySetRef.current;
    const startCount = countBySetId[playStartId];
    const endCount = countBySetId[playEndId];

    if (startCount === undefined || endCount === undefined) {
      alert("開始セット・終了セットの指定が不正です");
      return;
    }
    if (startCount >= endCount) {
      alert("開始セットは終了セットより前にしてください");
      return;
    }

    playRangeRef.current = { startCount, endCount };
    engine.setCount(startCount);
    setCurrentCount(startCount);
    engine.play();
    setIsPlaying(true);
  };

  const stopPlay = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.pause();
    }
    playRangeRef.current = null;
    setIsPlaying(false);
  };

  // ===== 整列系（編集用） =====
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
    const p0: WorldPos = { x: centerX - 10, y: centerY };
    const p2: WorldPos = { x: centerX + 10, y: centerY };
    const p1: WorldPos = { x: centerX, y: centerY - 8 };

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

  // ベジェポイント更新 / グループ移動
  const handleUpdateArcPoint = (index: number, pos: WorldPos) => {
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

  // ===== 表示用 positions を決定 =====
  const hasPlayback = Object.keys(playbackPositions).length > 0;

  const displayPositions: Record<string, WorldPos> = hasPlayback
    ? playbackPositions
    : currentSet.positions;

  const activeArc =
    arcBinding && arcBinding.setId === currentSetId ? arcBinding : null;

  // ===== レイアウト（UI整形） =====
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
    <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* 上部ヘッダ */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Drill Design Web
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pywareライクなブラウザ版ドリルエディタ
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/60">
              Members: {members.length}
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-900/60 border border-slate-600">
              Count: {Math.round(currentCount)}
            </span>
          </div>
        </header>

        {/* メインカード（Note + エディタ + SidePanel） */}
        <section className="flex gap-4">
          {/* 左：NotePanel をカードっぽく */}
          <div className="w-64 shrink-0 rounded-xl border border-slate-700 bg-slate-800/70 p-3">

            <h2 className="text-xs font-semibold text-slate-300 mb-1">
              Set Note
            </h2>
            <p className="text-[10px] text-slate-500 mb-2">
              このセット特有のメモを書いておく欄です。
            </p>
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <NotePanel
                note={currentSet.note}
                onChangeNote={handleChangeNote}
              />
            </div>
          </div>

          {/* 中央：コントロール＋フィールド */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                ドリルエディタ（DrillEngine駆動）
              </h2>

              {/* ズームコントロール */}
              <div className="flex items-center gap-1 text-xs">
                <span className="mr-1 text-slate-400">Zoom</span>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="px-2 py-1 border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 transition"
                >
                  −
                </button>
                <span className="px-2 py-1 bg-slate-900 rounded-md border border-slate-700 min-w-[52px] text-center">
                  {Math.round(canvasScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="px-2 py-1 border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 transition"
                >
                  ＋
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="ml-1 px-2 py-1 text-[10px] border border-slate-600 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">

              <DrillControls
                sets={sets.map((s) => ({
                  id: s.id,
                  name: s.name,
                  startCount: s.startCount,
                }))}
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
                onChangeSetStartCount={handleChangeSetStartCount}
              />

<div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">


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
                  scale={canvasScale}
                />
              </div>
            </div>
          </div>

          {/* 右：情報パネル */}
          <div className="w-64 shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 p-3">

            <h2 className="text-xs font-semibold text-slate-300 mb-2">
              メンバー情報
            </h2>
            <DrillSidePanel
              members={members as any}
              selectedIds={selectedIds}
              currentSetPositions={currentSet.positions}
            />
          </div>
        </section>

        {/* 下：タイムラインカード */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">

          <Timeline
            sets={sets.map((s, index) => ({
              id: s.id,
              name: s.name,
              startCount: s.startCount,
              endCount:
                index < sets.length - 1
                  ? sets[index + 1].startCount
                  : s.startCount + 16,
            }))}
            playStartId={playStartId}
            playEndId={playEndId}
            currentCount={currentCount}
            onScrub={handleScrub}
            onAddSetAtCurrent={() => addSetAtCount(currentCount)} // ★ 追加
          />
        </section>

        {/* 下：3Dプレビュー */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 w-[340px]">

          <h2 className="text-xs font-semibold text-slate-300 mb-2">
            3Dプレビュー
          </h2>
          <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">

            <Drill3DPreview
              members={members as any}
              positions={displayPositions}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
