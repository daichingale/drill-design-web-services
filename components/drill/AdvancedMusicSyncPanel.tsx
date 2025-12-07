// components/drill/AdvancedMusicSyncPanel.tsx
"use client";

import { useState, useRef } from "react";
import type { MusicSyncMarker, MusicTrack } from "@/hooks/useMusicSync";

type Props = {
  isLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  markers: MusicSyncMarker[];
  bpm: number | null;
  playbackRate: number;
  tracks: MusicTrack[];
  autoSyncEnabled: boolean;
  fileName?: string | null;
  onLoadMusic: (file: File) => Promise<boolean>;
  onPlayMusic: () => void;
  onStopMusic: () => void;
  onAddMarker: (musicTime: number, count: number) => string;
  onRemoveMarker: (id: string) => void;
  onUpdateMarker: (id: string, musicTime: number, count: number) => void;
  onSetBPM: (bpm: number | null) => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetPlaybackRateFromBPM: (targetBPM: number, baseBPM: number) => void;
  onAddTrack: (name: string, file: File) => string;
  onRemoveTrack: (trackId: string) => void;
  onSetTrackVolume: (trackId: string, volume: number) => void;
  onSetTrackEnabled: (trackId: string, enabled: boolean) => void;
  onSetAutoSync: (enabled: boolean) => void;
  onSyncCurrentTime: (currentCount: number) => void;
  currentCount: number;
  playbackBPM: number;
  onSetPlaybackBPM: (bpm: number) => void;
};

export default function AdvancedMusicSyncPanel({
  isLoaded,
  isPlaying,
  currentTime,
  duration,
  markers,
  bpm,
  playbackRate,
  tracks,
  autoSyncEnabled,
  fileName,
  onLoadMusic,
  onPlayMusic,
  onStopMusic,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onSetBPM,
  onSetPlaybackRate,
  onSetPlaybackRateFromBPM,
  onAddTrack,
  onRemoveTrack,
  onSetTrackVolume,
  onSetTrackEnabled,
  onSetAutoSync,
  onSyncCurrentTime,
  currentCount,
  playbackBPM,
  onSetPlaybackBPM,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackFileInputRef = useRef<HTMLInputElement>(null);
  const [bpmInput, setBpmInput] = useState<string>(bpm?.toString() || "");
  const [playbackBpmInput, setPlaybackBpmInput] = useState<string>(playbackBPM.toString());
  const [playbackRateInput, setPlaybackRateInput] = useState<string>(playbackRate.toString());
  const [newTrackName, setNewTrackName] = useState("");
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [editingMarkerTime, setEditingMarkerTime] = useState<string>("");
  const [editingMarkerCount, setEditingMarkerCount] = useState<string>("");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("音声ファイルを選択してください");
      return;
    }

    await onLoadMusic(file);
  };

  const handleTrackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("音声ファイルを選択してください");
      return;
    }

    const name = newTrackName.trim() || file.name;
    onAddTrack(name, file);
    setNewTrackName("");
    if (trackFileInputRef.current) {
      trackFileInputRef.current.value = "";
    }
  };

  const handleBPMApply = () => {
    const bpmValue = parseFloat(bpmInput);
    if (isNaN(bpmValue) || bpmValue <= 0) {
      alert("有効なBPMを入力してください");
      return;
    }
    onSetBPM(bpmValue);
  };

  const handlePlaybackRateApply = () => {
    const rate = parseFloat(playbackRateInput);
    if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
      alert("有効な再生速度を入力してください（0.5-2.0）");
      return;
    }
    onSetPlaybackRate(rate);
  };

  const handleBPMBasedRate = () => {
    const targetBPM = parseFloat(playbackBpmInput);
    const baseBPM = bpm || 120;
    if (isNaN(targetBPM) || targetBPM <= 0) {
      alert("有効なBPMを入力してください");
      return;
    }
    onSetPlaybackRateFromBPM(targetBPM, baseBPM);
  };

  const handleMarkerEdit = (marker: MusicSyncMarker) => {
    setEditingMarker(marker.id);
    setEditingMarkerTime(marker.musicTime.toFixed(2));
    setEditingMarkerCount(marker.count.toString());
  };

  const handleMarkerSave = (id: string) => {
    const time = parseFloat(editingMarkerTime);
    const count = parseFloat(editingMarkerCount);
    if (!isNaN(time) && !isNaN(count)) {
      onUpdateMarker(id, time, count);
    }
    setEditingMarker(null);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        音楽同期（高度設定）
      </h2>

      {/* 再生テンポ（BPM）設定 */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-300">
          再生テンポ（BPM）
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={playbackBpmInput}
            onChange={(e) => setPlaybackBpmInput(e.target.value)}
            placeholder="例: 120"
            min="1"
            max="300"
            className="flex-1 px-2 py-1 text-xs bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
          />
          <button
            onClick={() => {
              const bpmValue = parseFloat(playbackBpmInput);
              if (!isNaN(bpmValue) && bpmValue > 0) {
                onSetPlaybackBPM(bpmValue);
              }
            }}
            className="px-2 py-1 text-xs rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors whitespace-nowrap"
          >
            適用
          </button>
        </div>
      </div>

      {/* ファイル読み込み */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 transition-colors"
        >
          {isLoaded ? "メイン音楽を変更" : "メイン音楽を読み込む"}
        </button>
        {isLoaded && fileName && (
          <p className="text-[10px] text-slate-400 break-all">
            読み込み中: {fileName.length > 30 ? `${fileName.slice(0, 30)}...` : fileName}
          </p>
        )}
      </div>

      {/* 再生速度調整 */}
      {isLoaded && (
        <div className="space-y-2">
          <label className="block text-xs text-slate-300">
            再生速度（BPM調整）
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={playbackRateInput}
              onChange={(e) => setPlaybackRateInput(e.target.value)}
              placeholder="1.0"
              min="0.5"
              max="2.0"
              step="0.1"
              className="flex-1 px-2 py-1 text-xs bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
            <button
              onClick={handlePlaybackRateApply}
              className="px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 transition-colors"
            >
              適用
            </button>
          </div>
          {bpm && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={playbackBpmInput}
                onChange={(e) => setPlaybackBpmInput(e.target.value)}
                placeholder="目標BPM"
                className="flex-1 px-2 py-1 text-xs bg-slate-700/30 border border-slate-600 rounded text-slate-200"
              />
              <button
                onClick={handleBPMBasedRate}
                className="px-2 py-1 text-xs rounded bg-blue-600/80 hover:bg-blue-600 text-white"
              >
                BPMで調整
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            現在: {playbackRate.toFixed(2)}x ({playbackRate * 100}%)
          </p>
        </div>
      )}

      {/* 再生コントロール */}
      {isLoaded && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onPlayMusic}
                  className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors text-xs"
                >
                  {isPlaying ? "⏸ 一時停止" : "▶ 再生"}
                </button>
                <button
                  onClick={onStopMusic}
                  className="px-2 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 transition-colors text-xs"
                >
                  ⏹ 停止
                </button>
              </div>
            </div>

            {/* プログレスバー */}
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* BPM設定 */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-300">BPM（オプション）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bpmInput}
                onChange={(e) => setBpmInput(e.target.value)}
                placeholder="例: 144"
                className="flex-1 px-2 py-1 text-xs bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
              <button
                onClick={handleBPMApply}
                className="px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 transition-colors"
              >
                適用
              </button>
              {bpm && (
                <button
                  onClick={() => {
                    onSetBPM(null);
                    setBpmInput("");
                  }}
                  className="px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 自動シンク機能 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => onSetAutoSync(e.target.checked)}
                className="rounded"
              />
              自動シンク（マーカーに合わせてフォーメーション変更）
            </label>
            <p className="text-[10px] text-slate-400">
              マーカーのタイミングで自動的にセットを切り替えます
            </p>
          </div>

          {/* 手動同期 */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-300">
              手動同期（スペースキー）
            </label>
            <button
              onClick={() => {
                const nextCount = markers.length > 0 ? Math.round(markers[markers.length - 1].count) + 1 : 0;
                onSyncCurrentTime(nextCount);
              }}
              className="w-full px-3 py-2 text-xs rounded bg-blue-600/80 hover:bg-blue-600 text-white transition-colors"
            >
              マーカーを追加（カウント: {markers.length > 0 ? Math.round(markers[markers.length - 1].count) + 1 : 0}）
            </button>
          </div>

          {/* マーカー一覧（編集可能） */}
          {markers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">
                同期マーカー ({markers.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="p-2 bg-slate-900/50 rounded text-xs"
                  >
                    {editingMarker === marker.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingMarkerTime}
                            onChange={(e) => setEditingMarkerTime(e.target.value)}
                            placeholder="時間（秒）"
                            step="0.1"
                            className="flex-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-slate-200"
                          />
                          <input
                            type="number"
                            value={editingMarkerCount}
                            onChange={(e) => setEditingMarkerCount(e.target.value)}
                            placeholder="カウント"
                            className="flex-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-slate-200"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMarkerSave(marker.id)}
                            className="flex-1 px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingMarker(null)}
                            className="flex-1 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-200"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">
                          {formatTime(marker.musicTime)} → Count {Math.round(marker.count)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMarkerEdit(marker)}
                            className="text-blue-400 hover:text-blue-300"
                            title="編集"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onRemoveMarker(marker.id)}
                            className="text-red-400 hover:text-red-300"
                            title="削除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 複数トラック管理 */}
          <div className="space-y-2 border-t border-slate-700 pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              追加トラック
            </label>
            
            {/* トラック追加 */}
            <div className="space-y-1">
              <input
                type="text"
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                placeholder="トラック名（例: ドラム）"
                className="w-full px-2 py-1 text-xs bg-slate-700/30 border border-slate-600 rounded text-slate-200"
              />
              <input
                ref={trackFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleTrackFileSelect}
                className="hidden"
              />
              <button
                onClick={() => trackFileInputRef.current?.click()}
                className="w-full px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200"
              >
                + トラックを追加
              </button>
            </div>

            {/* トラック一覧 */}
            {tracks.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="p-2 bg-slate-900/50 rounded text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={track.enabled}
                          onChange={(e) => onSetTrackEnabled(track.id, e.target.checked)}
                          className="rounded"
                        />
                        <span>{track.name}</span>
                      </label>
                      <button
                        onClick={() => onRemoveTrack(track.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">音量:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={track.volume}
                        onChange={(e) => onSetTrackVolume(track.id, parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-[10px] text-slate-400 w-8">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


