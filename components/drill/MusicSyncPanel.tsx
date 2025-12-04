// components/drill/MusicSyncPanel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { MusicSyncMarker } from "@/hooks/useMusicSync";

type Props = {
  isLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  markers: MusicSyncMarker[];
  bpm: number | null;
  fileName?: string | null;
  onLoadMusic: (file: File) => Promise<boolean>;
  onPlayMusic: () => void;
  onStopMusic: () => void;
  onAddMarker: (musicTime: number, count: number) => string;
  onRemoveMarker: (id: string) => void;
  onSetBPM: (bpm: number | null) => void;
  onSyncCurrentTime: (currentCount: number) => void;
  currentCount: number;
  playbackBPM: number; // 再生テンポ（BPM）
  onSetPlaybackBPM: (bpm: number) => void; // 再生テンポを設定
};

export default function MusicSyncPanel({
  isLoaded,
  isPlaying,
  currentTime,
  duration,
  markers,
  bpm,
  fileName,
  onLoadMusic,
  onPlayMusic,
  onStopMusic,
  onAddMarker,
  onRemoveMarker,
  onSetBPM,
  onSyncCurrentTime,
  currentCount,
  playbackBPM,
  onSetPlaybackBPM,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bpmInput, setBpmInput] = useState<string>(bpm?.toString() || "");
  const [playbackBpmInput, setPlaybackBpmInput] = useState<string>(playbackBPM.toString());

  // playbackBPMが変更されたときにplaybackBpmInputも更新
  useEffect(() => {
    setPlaybackBpmInput(playbackBPM.toString());
  }, [playbackBPM]);

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

  const handleBPMApply = () => {
    const bpmValue = parseFloat(bpmInput);
    if (isNaN(bpmValue) || bpmValue <= 0) {
      alert("有効なBPMを入力してください");
      return;
    }
    onSetBPM(bpmValue);
  };

  const handlePlaybackBPMApply = () => {
    const bpmValue = parseFloat(playbackBpmInput);
    if (isNaN(bpmValue) || bpmValue <= 0) {
      alert("有効なBPMを入力してください");
      return;
    }
    onSetPlaybackBPM(bpmValue);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        音楽同期
      </h2>

      {/* 再生テンポ（BPM）設定 */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-300">
          再生テンポ（BPM）
          <span className="ml-1 text-[10px] text-slate-400">※音楽未読み込み時も有効</span>
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
            onClick={handlePlaybackBPMApply}
            className="px-2 py-1 text-xs rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors whitespace-nowrap"
          >
            適用
          </button>
        </div>
        <p className="text-[10px] text-slate-400">
          現在: {playbackBPM} BPM（1秒あたり {Math.round((playbackBPM / 60) * 100) / 100} カウント）
        </p>
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
          {isLoaded ? "音楽を変更" : "音楽を読み込む"}
        </button>
        {isLoaded && fileName && (
          <p className="text-[10px] text-slate-400 break-all">
            読み込み中の音源:{" "}
            <span className="text-slate-200">
              {(() => {
                const name = fileName;
                const max = 24;
                if (name.length <= max) return name;
                const dotIndex = name.lastIndexOf(".");
                const ext = dotIndex >= 0 ? name.slice(dotIndex) : "";
                const base = dotIndex >= 0 ? name.slice(0, dotIndex) : name;
                const keep = Math.max(4, max - ext.length - 3);
                const head = base.slice(0, Math.ceil(keep / 2));
                const tail = base.slice(-Math.floor(keep / 2));
                return `${head}…${tail}${ext}`;
              })()}
            </span>
          </p>
        )}
      </div>

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
                className="px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 transition-colors"
              >
                適用
              </button>
              {bpm && (
                <button
                  onClick={() => {
                    onSetBPM(null);
                    setBpmInput("");
                  }}
                  className="px-2 py-1 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 hover:text-slate-100 transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
            {bpm && (
              <p className="text-[10px] text-slate-400">
                BPM: {bpm} が設定されています
              </p>
            )}
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
            <p className="text-[10px] text-slate-400">
              スペースキーを押すと、現在の音楽時間にマーカーを追加します。カウントは自動的に1ずつ増えます。
            </p>
          </div>

          {/* マーカー一覧 */}
          {markers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">
                同期マーカー ({markers.length})
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded text-xs"
                  >
                    <span className="text-slate-300">
                      {formatTime(marker.musicTime)} → Count {Math.round(marker.count)}
                    </span>
                    <button
                      onClick={() => onRemoveMarker(marker.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

