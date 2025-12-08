"use client";

import { useState, useEffect } from "react";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import { STEP_M } from "@/lib/drill/utils";
import { compareDrillVersions } from "@/lib/drill/versionCompare";

type DrillVersion = {
  id: string;
  title: string;
  sets: UiSet[];
  members: Member[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName?: string;
};

type VersionCompareViewProps = {
  drillId: string;
  version1Id?: string;
  version2Id?: string;
  onClose: () => void;
  fieldWidth: number;
  fieldHeight: number;
};

/**
 * ドリルバージョン比較ビュー
 */
export default function VersionCompareView({
  drillId,
  version1Id,
  version2Id,
  onClose,
  fieldWidth,
  fieldHeight,
}: VersionCompareViewProps) {
  const [version1, setVersion1] = useState<DrillVersion | null>(null);
  const [version2, setVersion2] = useState<DrillVersion | null>(null);
  const [versions, setVersions] = useState<DrillVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(version1Id || null);
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(version2Id || null);

  useEffect(() => {
    loadVersions();
  }, [drillId]);

  useEffect(() => {
    if (selectedVersion1) {
      loadVersion(selectedVersion1, setVersion1);
    }
  }, [selectedVersion1]);

  useEffect(() => {
    if (selectedVersion2) {
      loadVersion(selectedVersion2, setVersion2);
    }
  }, [selectedVersion2]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // 変更履歴からバージョンを取得
      const response = await fetch(`/api/drills/${drillId}/history?limit=100`);
      if (response.ok) {
        const history = await response.json();
        // 現在のバージョンも含める
        const currentResponse = await fetch(`/api/drills/${drillId}`);
        if (currentResponse.ok) {
          const current = await currentResponse.json();
          const versionList: DrillVersion[] = [
            {
              id: "current",
              title: "現在のバージョン",
              sets: current.sets || [],
              members: current.members || [],
              createdAt: current.createdAt || new Date().toISOString(),
              updatedAt: current.updatedAt || new Date().toISOString(),
              userId: current.userId || "",
              userName: current.user?.name || undefined,
            },
          ];
          setVersions(versionList);
          
          // デフォルトで現在のバージョンを選択
          if (!selectedVersion1) {
            setSelectedVersion1("current");
          }
          if (!selectedVersion2 && versionList.length > 0) {
            // 最新の履歴エントリを選択
            if (history.length > 0) {
              // 履歴からバージョンを復元する必要があるが、簡易実装として現在のバージョンを使用
              setSelectedVersion2("current");
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersion = async (versionId: string, setter: (v: DrillVersion | null) => void) => {
    if (versionId === "current") {
      try {
        const response = await fetch(`/api/drills/${drillId}`);
        if (response.ok) {
          const data = await response.json();
          setter({
            id: "current",
            title: "現在のバージョン",
            sets: data.sets || [],
            members: data.members || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            userId: data.userId || "",
            userName: data.user?.name || undefined,
          });
        }
      } catch (error) {
        console.error("Failed to load version:", error);
      }
    }
  };

  // 差分を計算
  const calculateDiff = () => {
    if (!version1 || !version2) return null;
    return compareDrillVersions(version1, version2);
  };

  const diff = calculateDiff();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100">
      <div className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-bold">バージョン比較</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
        </div>

        {/* バージョン選択 */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">バージョン1</label>
              <select
                value={selectedVersion1 || ""}
                onChange={(e) => setSelectedVersion1(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100"
              >
                <option value="">選択してください</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({new Date(v.updatedAt).toLocaleString("ja-JP")})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">バージョン2</label>
              <select
                value={selectedVersion2 || ""}
                onChange={(e) => setSelectedVersion2(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100"
              >
                <option value="">選択してください</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({new Date(v.updatedAt).toLocaleString("ja-JP")})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 差分統計 */}
        {diff && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/30">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-emerald-400 font-semibold">{diff.sets.added.length}</div>
                <div className="text-slate-400 text-xs">セット追加</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-semibold">{diff.sets.removed.length}</div>
                <div className="text-slate-400 text-xs">セット削除</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-semibold">{diff.sets.modified.length}</div>
                <div className="text-slate-400 text-xs">セット変更</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold">{diff.statistics.positionChanges}</div>
                <div className="text-slate-400 text-xs">位置変更</div>
              </div>
            </div>
          </div>
        )}

        {/* 並列表示 */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-auto">
          {/* バージョン1 */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">
                {version1?.title || "バージョン1"}
              </h3>
              {version1 && (
                <div className="text-xs text-slate-400">
                  <div>更新日時: {new Date(version1.updatedAt).toLocaleString("ja-JP")}</div>
                  {version1.userName && <div>作成者: {version1.userName}</div>}
                </div>
              )}
            </div>
            {version1 ? (
              <VersionPreview
                sets={version1.sets}
                members={version1.members}
                fieldWidth={fieldWidth}
                fieldHeight={fieldHeight}
                highlightChanges={diff ? {
                  addedSetIds: diff.sets.added.map(s => s.id),
                  removedSetIds: diff.sets.removed.map(s => s.id),
                  modifiedSetIds: diff.sets.modified.map(m => m.set.id),
                } : undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                バージョンを選択してください
              </div>
            )}
          </div>

          {/* バージョン2 */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">
                {version2?.title || "バージョン2"}
              </h3>
              {version2 && (
                <div className="text-xs text-slate-400">
                  <div>更新日時: {new Date(version2.updatedAt).toLocaleString("ja-JP")}</div>
                  {version2.userName && <div>作成者: {version2.userName}</div>}
                </div>
              )}
            </div>
            {version2 ? (
              <VersionPreview
                sets={version2.sets}
                members={version2.members}
                fieldWidth={fieldWidth}
                fieldHeight={fieldHeight}
                highlightChanges={diff ? {
                  addedSetIds: diff.sets.added.map(s => s.id),
                  removedSetIds: diff.sets.removed.map(s => s.id),
                  modifiedSetIds: diff.sets.modified.map(m => m.set.id),
                } : undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                バージョンを選択してください
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * バージョンプレビューコンポーネント
 */
type VersionPreviewProps = {
  sets: UiSet[];
  members: Member[];
  fieldWidth: number;
  fieldHeight: number;
  highlightChanges?: {
    addedSetIds: string[];
    removedSetIds: string[];
    modifiedSetIds: string[];
  };
};

function VersionPreview({
  sets,
  members,
  fieldWidth,
  fieldHeight,
  highlightChanges,
}: VersionPreviewProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateThumbnail = async () => {
      const canvas = document.createElement("canvas");
      const scale = 0.2;
      canvas.width = fieldWidth * scale;
      canvas.height = fieldHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 背景
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // グリッド
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 0.5;
      const gridStep = STEP_M * scale;
      for (let x = 0; x <= fieldWidth; x += STEP_M) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= fieldHeight; y += STEP_M) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(canvas.width, y * scale);
        ctx.stroke();
      }

      // フィールド境界
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // セットごとにメンバーを描画
      const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
      sortedSets.forEach((set) => {
        const isAdded = highlightChanges?.addedSetIds.includes(set.id);
        const isRemoved = highlightChanges?.removedSetIds.includes(set.id);
        const isModified = highlightChanges?.modifiedSetIds.includes(set.id);

        Object.entries(set.positions).forEach(([memberId, pos]) => {
          const member = members.find((m) => m.id === memberId);
          if (!member) return;

          const x = pos.x * scale;
          const y = pos.y * scale;
          const radius = 2;

          // 変更状態に応じて色を変更
          let color = member.color || "#888888";
          if (isAdded) color = "#10b981"; // emerald
          if (isRemoved) color = "#ef4444"; // red
          if (isModified) color = "#f59e0b"; // amber

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.3;
          ctx.stroke();
        });
      });

      const url = canvas.toDataURL("image/png");
      setThumbnailUrl(url);
    };

    generateThumbnail();
  }, [sets, members, fieldWidth, fieldHeight, highlightChanges]);

  return (
    <div className="space-y-4">
      {/* サムネイル */}
      {thumbnailUrl ? (
        <div className="relative">
          <img
            src={thumbnailUrl}
            alt="Version preview"
            className="w-full rounded-lg border border-slate-700"
          />
          {highlightChanges && (
            <div className="absolute top-2 right-2 flex gap-2">
              {highlightChanges.addedSetIds.length > 0 && (
                <div className="px-2 py-1 rounded bg-emerald-600/80 text-xs text-white">
                  +{highlightChanges.addedSetIds.length}
                </div>
              )}
              {highlightChanges.removedSetIds.length > 0 && (
                <div className="px-2 py-1 rounded bg-red-600/80 text-xs text-white">
                  -{highlightChanges.removedSetIds.length}
                </div>
              )}
              {highlightChanges.modifiedSetIds.length > 0 && (
                <div className="px-2 py-1 rounded bg-yellow-600/80 text-xs text-white">
                  ~{highlightChanges.modifiedSetIds.length}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-slate-400">
          読み込み中...
        </div>
      )}

      {/* セット一覧 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">セット一覧</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sets.length === 0 ? (
            <div className="text-xs text-slate-400">セットがありません</div>
          ) : (
            sets
              .sort((a, b) => a.startCount - b.startCount)
              .map((set) => {
                const isAdded = highlightChanges?.addedSetIds.includes(set.id);
                const isRemoved = highlightChanges?.removedSetIds.includes(set.id);
                const isModified = highlightChanges?.modifiedSetIds.includes(set.id);

                return (
                  <div
                    key={set.id}
                    className={`text-xs p-2 rounded ${
                      isAdded
                        ? "bg-emerald-900/30 border border-emerald-600/50"
                        : isRemoved
                        ? "bg-red-900/30 border border-red-600/50"
                        : isModified
                        ? "bg-yellow-900/30 border border-yellow-600/50"
                        : "bg-slate-700/30"
                    }`}
                  >
                    <div className="font-medium">{set.name || `Set ${set.id}`}</div>
                    <div className="text-slate-400">Count {Math.round(set.startCount)}</div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* メンバー一覧 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">メンバー ({members.length})</div>
        <div className="text-xs text-slate-400">
          {members.map((m) => m.name).join(", ")}
        </div>
      </div>
    </div>
  );
}

