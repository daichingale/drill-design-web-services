// components/drill/MobileView.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { WorldPos, ArcBinding } from "@/lib/drill/types";
import FieldCanvas, { type FieldCanvasRef } from "@/components/drill/FieldCanvas";
import MobileTimeline from "@/components/drill/MobileTimeline";

type Props = {
  sets: UiSet[];
  currentSet: UiSet;
  currentSetId: string;
  members: Member[];
  selectedIds: string[];
  isPlaying: boolean;
  displayPositions: Record<string, WorldPos>;
  activeArc: ArcBinding | null;
  canvasScale: number;
  lineEditState: any;
  boxEditState: any;
  settings: {
    showPaths: boolean;
    showCollisions: boolean;
    pathSmoothing: boolean;
  };
  onToggleSet: (setId: string) => void;
  onToggleSelect: (id: string, multi: boolean) => void;
  onStartPlay: (startCount?: number, endCount?: number, loop?: boolean) => void;
  onStopPlay: () => void;
  onShowFullView: () => void;
  // タイムライン関連
  currentCount: number;
  onAddSetAtCurrent: () => void;
  onDeleteSet: (id: string) => void;
  onScrub: (count: number) => void;
  onMoveMember: (id: string, pos: WorldPos) => void;
  onUpdateArcPoint: (index: number, pos: WorldPos) => void;
  onMoveArcGroup: (dx: number, dy: number) => void;
  onRectSelect: (ids: string[]) => void;
  clampAndSnap: (p: WorldPos) => WorldPos;
  onRotateSelected: (center: WorldPos, angle: number) => void;
  onUpdateLineEdit: (start: WorldPos, end: WorldPos) => void;
  onUpdateBoxEdit: (corners: { tl: WorldPos; tr: WorldPos; br: WorldPos; bl: WorldPos }) => void;
  onAddIntermediatePoint: (memberId: string, count: number, position: WorldPos) => void;
  onRemoveIntermediatePoint: (memberId: string, count: number) => void;
  // 基本操作
  onQuickDelete?: () => void;
  onQuickCopy?: () => void;
  onQuickArrangeLine?: () => void;
  onQuickDeselectAll?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onArrangeCircle?: (center: WorldPos, radius: number) => void;
  onArrangeRectangle?: (center: WorldPos, width: number, height: number) => void;
  onArrangeSpiral?: (center: WorldPos, maxRadius: number, turns?: number) => void;
  onArrangeBox?: (center: WorldPos, width: number, height: number, spacing?: number) => void;
};

export default function MobileView({
  sets,
  currentSet,
  currentSetId,
  members,
  selectedIds,
  isPlaying,
  displayPositions,
  activeArc,
  canvasScale,
  lineEditState,
  boxEditState,
  settings,
  onToggleSet,
  onToggleSelect,
  onStartPlay,
  onStopPlay,
  onShowFullView,
  currentCount,
  onAddSetAtCurrent,
  onDeleteSet,
  onScrub,
  onMoveMember,
  onUpdateArcPoint,
  onMoveArcGroup,
  onRectSelect,
  clampAndSnap,
  onRotateSelected,
  onUpdateLineEdit,
  onUpdateBoxEdit,
  onAddIntermediatePoint,
  onRemoveIntermediatePoint,
  onQuickDelete,
  onQuickCopy,
  onQuickArrangeLine,
  onQuickDeselectAll,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onArrangeCircle,
  onArrangeRectangle,
  onArrangeSpiral,
  onArrangeBox,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const canvasRef = useRef<FieldCanvasRef>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const originalOrientationLock = useRef<string | null>(null);

  // 全画面表示の切り替え
  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // 全画面表示に切り替え
        if (fullscreenContainerRef.current.requestFullscreen) {
          await fullscreenContainerRef.current.requestFullscreen();
        } else if ((fullscreenContainerRef.current as any).webkitRequestFullscreen) {
          await (fullscreenContainerRef.current as any).webkitRequestFullscreen();
        } else if ((fullscreenContainerRef.current as any).mozRequestFullScreen) {
          await (fullscreenContainerRef.current as any).mozRequestFullScreen();
        } else if ((fullscreenContainerRef.current as any).msRequestFullscreen) {
          await (fullscreenContainerRef.current as any).msRequestFullscreen();
        }

        // 画面の向きを横向きにロック（Screen Orientation APIが利用可能な場合）
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock("landscape");
          } catch (err) {
            console.warn("画面の向きをロックできませんでした:", err);
          }
        }
      } else {
        // 全画面表示を解除
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }

        // 画面の向きのロックを解除
        if (screen.orientation && (screen.orientation as any).unlock) {
          try {
            (screen.orientation as any).unlock();
          } catch (err) {
            console.warn("画面の向きのロックを解除できませんでした:", err);
          }
        }
      }
    } catch (err) {
      console.error("全画面表示の切り替えに失敗しました:", err);
    }
  };

  // 全画面表示の状態を監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // コンポーネントのアンマウント時に全画面表示を解除
  useEffect(() => {
    return () => {
      if (isFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    };
  }, [isFullscreen]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden relative">
      {/* 左サイドバー（細いバー、矢印のみ） */}
      <button
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-20 bg-slate-800/90 hover:bg-slate-700/90 border-r border-slate-700 rounded-r-lg flex items-center justify-center z-40 transition-colors shadow-lg"
        aria-label="操作メニュー"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 右サイドバー（細いバー、矢印のみ） */}
      <button
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-20 bg-slate-800/90 hover:bg-slate-700/90 border-l border-slate-700 rounded-l-lg flex items-center justify-center z-40 transition-colors shadow-lg"
        aria-label="メンバーリスト"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* オーバーレイ（左パネル用） */}
      {isLeftPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsLeftPanelOpen(false)}
        />
      )}

      {/* 左サイドパネル（操作メニュー、中央にスライド） */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90vw] max-h-[80vh] bg-slate-800 rounded-lg border border-slate-700 z-50 transform transition-all duration-300 ease-in-out overflow-hidden shadow-2xl ${
          isLeftPanelOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-800">
          <h2 className="text-lg font-semibold">操作メニュー</h2>
          <button
            onClick={() => setIsLeftPanelOpen(false)}
            className="p-2 rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-73px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Undo/Redo */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">操作履歴</h3>
            <div className="flex gap-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                  canUndo
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                } transition-colors`}
              >
                元に戻す
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                  canRedo
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                } transition-colors`}
              >
                やり直し
              </button>
            </div>
          </div>

          {/* クイックアクション */}
          {selectedIds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">選択中の操作 ({selectedIds.length}人)</h3>
              <div className="grid grid-cols-2 gap-2">
                {onQuickCopy && (
                  <button
                    onClick={onQuickCopy}
                    className="px-3 py-2 rounded-md text-sm bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                  >
                    コピー
                  </button>
                )}
                {onQuickDelete && (
                  <button
                    onClick={onQuickDelete}
                    className="px-3 py-2 rounded-md text-sm bg-red-700 hover:bg-red-600 text-white transition-colors"
                  >
                    削除
                  </button>
                )}
                {onQuickArrangeLine && (
                  <button
                    onClick={onQuickArrangeLine}
                    className="px-3 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                  >
                    直線整列
                  </button>
                )}
                {onQuickDeselectAll && (
                  <button
                    onClick={onQuickDeselectAll}
                    className="px-3 py-2 rounded-md text-sm bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                  >
                    選択解除
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 形状作成 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">形状作成</h3>
            <div className="grid grid-cols-2 gap-2">
              {onArrangeCircle && (
                <button
                  onClick={() => {
                    const center = { x: 50, y: 25 }; // デフォルトのフィールド中心
                    onArrangeCircle(center, 10);
                    setIsLeftPanelOpen(false);
                  }}
                  className="px-3 py-2 rounded-md text-sm bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                >
                  円形
                </button>
              )}
              {onArrangeRectangle && (
                <button
                  onClick={() => {
                    const center = { x: 50, y: 25 }; // デフォルトのフィールド中心
                    onArrangeRectangle(center, 20, 20);
                    setIsLeftPanelOpen(false);
                  }}
                  className="px-3 py-2 rounded-md text-sm bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                >
                  四角形
                </button>
              )}
              {onArrangeSpiral && (
                <button
                  onClick={() => {
                    const center = { x: 50, y: 25 }; // デフォルトのフィールド中心
                    onArrangeSpiral(center, 15);
                    setIsLeftPanelOpen(false);
                  }}
                  className="px-3 py-2 rounded-md text-sm bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                >
                  螺旋
                </button>
              )}
              {onArrangeBox && (
                <button
                  onClick={() => {
                    const center = { x: 50, y: 25 }; // デフォルトのフィールド中心
                    onArrangeBox(center, 20, 20);
                    setIsLeftPanelOpen(false);
                  }}
                  className="px-3 py-2 rounded-md text-sm bg-purple-700 hover:bg-purple-600 text-white transition-colors"
                >
                  ボックス
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              詳細な操作は「詳細表示」ボタンからデスクトップビューに切り替えてください。
            </p>
          </div>
        </div>
      </div>

      {/* オーバーレイ（右パネル用） */}
      {isRightPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsRightPanelOpen(false)}
        />
      )}

      {/* 右サイドパネル（メンバーリスト、中央にスライド） */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90vw] max-h-[80vh] bg-slate-800 rounded-lg border border-slate-700 z-50 transform transition-all duration-300 ease-in-out overflow-hidden shadow-2xl ${
          isRightPanelOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-800">
          <h2 className="text-lg font-semibold">メンバー ({members.length})</h2>
          <button
            onClick={() => setIsRightPanelOpen(false)}
            className="p-2 rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(80vh-73px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {members.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            const position = currentSet.positions[member.id];
            return (
              <div
                key={member.id}
                onClick={() => onToggleSelect(member.id, false)}
                className={`p-2.5 rounded-md border active:scale-[0.98] transition-transform ${
                  isSelected
                    ? "bg-emerald-600/20 border-emerald-500"
                    : "bg-slate-800 border-slate-700 active:bg-slate-750"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{member.name}</div>
                    <div className="text-xs text-slate-400">{member.part}</div>
                  </div>
                  {position && (
                    <div className="text-xs text-slate-400 shrink-0">
                      ({position.x.toFixed(1)}, {position.y.toFixed(1)})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* メインコンテンツエリア（フィールドキャンバス） */}
      <div className="flex-1 flex flex-col min-w-0 relative min-h-0">
        {/* 上部コントロールバー */}
        <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">ドリルエディタ</h1>
            <span className="text-xs text-slate-400">
              {currentSet.name || `Set ${Math.round(currentSet.startCount)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 詳細表示ボタン */}
            <button
              onClick={onShowFullView}
              className="px-2.5 py-1.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-white active:bg-slate-500 transition-colors"
            >
              詳細
            </button>
          </div>
        </div>

        {/* フィールドキャンバス */}
        <div ref={fullscreenContainerRef} className="flex-1 bg-slate-950 relative min-h-0">
          {/* 全画面ボタン */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 z-50 p-2.5 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600/50 text-white shadow-lg transition-colors active:scale-95"
            aria-label={isFullscreen ? "全画面を解除" : "全画面表示"}
            title={isFullscreen ? "全画面を解除" : "全画面表示（横向き）"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
          <FieldCanvas
            ref={canvasRef}
            members={members}
            displayPositions={displayPositions}
            currentSetPositions={currentSet.positions}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            isPlaying={isPlaying}
            activeArc={activeArc}
            onMoveMember={onMoveMember}
            onUpdateArcPoint={onUpdateArcPoint}
            onMoveArcGroup={onMoveArcGroup}
            scale={canvasScale}
            onRectSelect={onRectSelect}
            clampAndSnap={clampAndSnap}
            onRotateSelected={onRotateSelected}
            lineEditState={lineEditState}
            onUpdateLineEdit={onUpdateLineEdit}
            boxEditState={boxEditState}
            onUpdateBoxEdit={onUpdateBoxEdit}
            sets={sets}
            showPaths={settings.showPaths}
            showCollisions={settings.showCollisions}
            pathSmoothing={settings.pathSmoothing}
            onAddIntermediatePoint={onAddIntermediatePoint}
            onRemoveIntermediatePoint={onRemoveIntermediatePoint}
          />
        </div>

        {/* 下部ステータスバー */}
        <div className="p-2 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-400 shrink-0">
          <div className="flex items-center justify-between">
            <div>選択中: {selectedIds.length}人</div>
            <div>メンバー: {members.length}人</div>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <MobileTimeline
        sets={sets}
        currentSetId={currentSetId}
        currentCount={currentCount}
        isPlaying={isPlaying}
        onToggleSet={onToggleSet}
        onAddSetAtCurrent={onAddSetAtCurrent}
        onDeleteSet={onDeleteSet}
        onStartPlay={onStartPlay}
        onStopPlay={onStopPlay}
        onScrub={onScrub}
      />

    </div>
  );
}

