// hooks/useMusicSync.ts
// 音楽同期機能

import { useState, useRef, useCallback, useEffect } from "react";

export type MusicSyncMarker = {
  id: string;
  musicTime: number; // 音楽の時間（秒）
  count: number; // 対応するカウント
};

export type MusicTrack = {
  id: string;
  name: string;
  file: File | null;
  audioElement: HTMLAudioElement | null;
  volume: number; // 0-1
  enabled: boolean;
};

export type MusicSyncState = {
  isLoaded: boolean;
  isPlaying: boolean;
  currentTime: number; // 現在の音楽時間（秒）
  duration: number; // 音楽の長さ（秒）
  markers: MusicSyncMarker[];
  bpm: number | null; // BPM（自動検出または手動設定）
  playbackRate: number; // 再生速度（0.5-2.0）
  fileName?: string | null; // 読み込んだ音楽ファイル名
  audioStream?: MediaStream | null; // 録画用にミックスされたオーディオストリーム
  tracks: MusicTrack[]; // 複数トラック対応
  autoSyncEnabled: boolean; // 自動シンク機能
};

export function useMusicSync() {
  const [state, setState] = useState<MusicSyncState>({
    isLoaded: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    markers: [],
    bpm: null,
    playbackRate: 1.0,
    fileName: null,
    audioStream: null,
    tracks: [],
    autoSyncEnabled: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastMarkerCountRef = useRef<number | null>(null); // 最後に追加したマーカーのカウント

  // 音楽ファイルを読み込む
  const loadMusic = useCallback(async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => {
          // 再生速度を設定
          audio.playbackRate = state.playbackRate;
          
          setState((prev) => ({
            ...prev,
            isLoaded: true,
            duration: audio.duration,
            fileName: file.name,
            audioStream: prev.audioStream ?? null,
          }));
          audioRef.current = audio;
          resolve();
        };
        audio.onerror = (e) => {
          // 一部ブラウザで、以前のオーディオが破棄されたときに AbortError が飛ぶことがあるので無視する
          const err = (e as any)?.error as DOMException | undefined;
          if (err && err.name === "AbortError") {
            console.warn("Audio load aborted (AbortError). This can be ignored.", err);
            resolve();
            return;
          }
          reject(err ?? e);
        };
      });

      // AudioContextを作成し、再生 + 録画用のストリームを作る
      const audioContext =
        audioContextRef.current ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // 既存のソースノードがあれば切り離す
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {
          // noop
        }
      }

      const sourceNode = audioContext.createMediaElementSource(audio);
      sourceNodeRef.current = sourceNode;

      // スピーカー出力用
      sourceNode.connect(audioContext.destination);

      // 録画用の MediaStream を作成
      const dest = audioContext.createMediaStreamDestination();
      sourceNode.connect(dest);

      setState((prev) => ({
        ...prev,
        audioStream: dest.stream,
      }));

      return true;
    } catch (error: any) {
      // メディアがドキュメントから除去されたときの AbortError はユーザーには見せない
      if (error && error.name === "AbortError") {
        console.warn("Audio play/load aborted (AbortError).", error);
        return false;
      }
      console.error("Failed to load music:", error);
      alert("音楽ファイルの読み込みに失敗しました");
      return false;
    }
  }, []);

  // 音楽を再生
  const playMusic = useCallback(() => {
    if (!audioRef.current || !state.isLoaded) return;

    if (state.isPlaying) {
      // 既に再生中なら一時停止
      audioRef.current.pause();
      pausedTimeRef.current = audioRef.current.currentTime;
      // 他のトラックも一時停止
      state.tracks.forEach((track) => {
        if (track.audioElement) {
          track.audioElement.pause();
        }
      });
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      // 再生開始
      audioRef.current.currentTime = pausedTimeRef.current;
      audioRef.current.playbackRate = state.playbackRate;
      audioRef.current.play();
      startTimeRef.current = performance.now() - pausedTimeRef.current * 1000;
      
      // 他のトラックも再生
      state.tracks.forEach((track) => {
        if (track.audioElement && track.enabled) {
          track.audioElement.currentTime = pausedTimeRef.current;
          track.audioElement.playbackRate = state.playbackRate;
          track.audioElement.volume = track.volume;
          track.audioElement.play();
        }
      });
      
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [state.isLoaded, state.isPlaying, state.playbackRate, state.tracks]);

  // 音楽を停止
  const stopMusic = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    pausedTimeRef.current = 0;
    
    // 他のトラックも停止
    state.tracks.forEach((track) => {
      if (track.audioElement) {
        track.audioElement.pause();
        track.audioElement.currentTime = 0;
      }
    });
    
    setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, [state.tracks]);

  // 音楽の時間を更新
  useEffect(() => {
    if (!audioRef.current || !state.isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        setState((prev) => ({
          ...prev,
          currentTime: audioRef.current!.currentTime,
        }));
      }
    }, 100); // 100msごとに更新

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  // マーカーを追加
  const addMarker = useCallback((musicTime: number, count?: number) => {
    // カウントが指定されていない場合、最後のマーカーのカウント+1を使用
    // マーカーがない場合は、現在のカウントを使用（または0）
    let markerCount: number;
    if (count !== undefined) {
      markerCount = count;
    } else if (lastMarkerCountRef.current !== null) {
      markerCount = lastMarkerCountRef.current + 1;
    } else {
      markerCount = 0; // デフォルト値
    }

    const marker: MusicSyncMarker = {
      id: `marker-${Date.now()}`,
      musicTime,
      count: markerCount,
    };
    
    lastMarkerCountRef.current = markerCount;
    
    setState((prev) => ({
      ...prev,
      markers: [...prev.markers, marker].sort((a, b) => a.musicTime - b.musicTime),
    }));
    return marker.id;
  }, []);

  // マーカーを削除
  const removeMarker = useCallback((id: string) => {
    setState((prev) => {
      const newMarkers = prev.markers.filter((m) => m.id !== id);
      // 最後のマーカーのカウントを更新
      if (newMarkers.length > 0) {
        const sortedMarkers = [...newMarkers].sort((a, b) => a.musicTime - b.musicTime);
        lastMarkerCountRef.current = sortedMarkers[sortedMarkers.length - 1].count;
      } else {
        lastMarkerCountRef.current = null;
      }
      return {
        ...prev,
        markers: newMarkers,
      };
    });
  }, []);

  // マーカーを更新
  const updateMarker = useCallback((id: string, musicTime: number, count: number) => {
    setState((prev) => ({
      ...prev,
      markers: prev.markers.map((m) =>
        m.id === id ? { ...m, musicTime, count } : m
      ),
    }));
  }, []);

  // 現在の音楽時間からカウントを計算（マーカーを使用）
  const getCountFromMusicTime = useCallback(
    (musicTime: number): number | null => {
      if (state.markers.length === 0) return null;

      // 最も近いマーカーを探す
      let closestMarker: MusicSyncMarker | null = null;
      let minDistance = Infinity;

      state.markers.forEach((marker) => {
        const distance = Math.abs(marker.musicTime - musicTime);
        if (distance < minDistance) {
          minDistance = distance;
          closestMarker = marker;
        }
      });

      if (!closestMarker) return null;

      // マーカーを時間順にソート
      const sortedMarkers = [...state.markers].sort(
        (a, b) => a.musicTime - b.musicTime
      );

      // 音楽時間が最初のマーカーより前の場合、最初のマーカーのカウントを返す
      // （音楽は0:00から始まるが、マーカー0のタイミングまでカウント0のまま）
      if (musicTime < sortedMarkers[0].musicTime) {
        return sortedMarkers[0].count;
      }

      // 音楽時間が最後のマーカーより後の場合、最後のマーカーのカウントを返す
      if (musicTime >= sortedMarkers[sortedMarkers.length - 1].musicTime) {
        return sortedMarkers[sortedMarkers.length - 1].count;
      }

      // マーカー間で補間
      for (let i = 0; i < sortedMarkers.length - 1; i++) {
        const marker1 = sortedMarkers[i];
        const marker2 = sortedMarkers[i + 1];

        if (musicTime >= marker1.musicTime && musicTime < marker2.musicTime) {
          // BPMが設定されている場合は、BPMから計算
          if (state.bpm) {
            const beatsPerSecond = state.bpm / 60;
            const timeDiff = musicTime - marker1.musicTime;
            const beatsDiff = timeDiff * beatsPerSecond;
            return marker1.count + beatsDiff * 4; // 4拍子を仮定
          }

          // 線形補間
          const timeRange = marker2.musicTime - marker1.musicTime;
          const countRange = marker2.count - marker1.count;
          const ratio = (musicTime - marker1.musicTime) / timeRange;
          return marker1.count + countRange * ratio;
        }
      }

      // フォールバック（通常は到達しない）
      return sortedMarkers[0].count;
    },
    [state.markers, state.bpm]
  );

  // カウントから音楽時間を計算
  const getMusicTimeFromCount = useCallback(
    (count: number): number | null => {
      if (state.markers.length === 0) return null;

      // BPMが設定されている場合は、BPMから計算
      if (state.bpm) {
        const beatsPerSecond = state.bpm / 60;
        const closestMarker = state.markers[0]; // 最初のマーカーを使用
        const countDiff = count - closestMarker.count;
        const beatsDiff = countDiff / 4; // 4拍子を仮定
        return closestMarker.musicTime + beatsDiff / beatsPerSecond;
      }

      // マーカー間の補間
      for (let i = 0; i < state.markers.length - 1; i++) {
        const marker1 = state.markers[i];
        const marker2 = state.markers[i + 1];

        if (count >= marker1.count && count <= marker2.count) {
          const countRange = marker2.count - marker1.count;
          const timeRange = marker2.musicTime - marker1.musicTime;
          const ratio = (count - marker1.count) / countRange;
          return marker1.musicTime + timeRange * ratio;
        }
      }

      // 範囲外の場合は最初または最後のマーカーを使用
      if (count < state.markers[0].count) {
        return state.markers[0].musicTime;
      }
      if (count > state.markers[state.markers.length - 1].count) {
        return state.markers[state.markers.length - 1].musicTime;
      }

      return null;
    },
    [state.markers, state.bpm]
  );

  // BPMを設定
  const setBPM = useCallback((bpm: number | null) => {
    setState((prev) => ({ ...prev, bpm }));
  }, []);

  // 再生速度を設定（BPM調整による速度変更）
  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }
    state.tracks.forEach((track) => {
      if (track.audioElement) {
        track.audioElement.playbackRate = clampedRate;
      }
    });
    setState((prev) => ({ ...prev, playbackRate: clampedRate }));
  }, [state.tracks]);

  // BPMから再生速度を計算（基準BPMとの比率）
  const setPlaybackRateFromBPM = useCallback((targetBPM: number, baseBPM: number) => {
    if (baseBPM <= 0) return;
    const rate = targetBPM / baseBPM;
    setPlaybackRate(rate);
  }, [setPlaybackRate]);

  // トラックを追加
  const addTrack = useCallback((name: string, file: File) => {
    const track: MusicTrack = {
      id: `track-${Date.now()}`,
      name,
      file,
      audioElement: null,
      volume: 1.0,
      enabled: true,
    };
    
    // オーディオ要素を作成
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.volume = track.volume;
    track.audioElement = audio;
    
    setState((prev) => ({
      ...prev,
      tracks: [...prev.tracks, track],
    }));
    
    return track.id;
  }, []);

  // トラックを削除
  const removeTrack = useCallback((trackId: string) => {
    setState((prev) => {
      const track = prev.tracks.find((t) => t.id === trackId);
      if (track?.audioElement) {
        track.audioElement.pause();
        if (track.file) {
          URL.revokeObjectURL(track.audioElement.src);
        }
      }
      return {
        ...prev,
        tracks: prev.tracks.filter((t) => t.id !== trackId),
      };
    });
  }, []);

  // トラックの音量を設定
  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState((prev) => {
      const updatedTracks = prev.tracks.map((track) => {
        if (track.id === trackId) {
          if (track.audioElement) {
            track.audioElement.volume = clampedVolume;
          }
          return { ...track, volume: clampedVolume };
        }
        return track;
      });
      return { ...prev, tracks: updatedTracks };
    });
  }, []);

  // トラックの有効/無効を切り替え
  const setTrackEnabled = useCallback((trackId: string, enabled: boolean) => {
    setState((prev) => {
      const updatedTracks = prev.tracks.map((track) => {
        if (track.id === trackId) {
          if (track.audioElement) {
            if (enabled && prev.isPlaying) {
              track.audioElement.currentTime = pausedTimeRef.current;
              track.audioElement.play();
            } else if (!enabled) {
              track.audioElement.pause();
            }
          }
          return { ...track, enabled };
        }
        return track;
      });
      return { ...prev, tracks: updatedTracks };
    });
  }, []);

  // 自動シンク機能（マーカーに合わせてフォーメーション変更）
  const setAutoSync = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, autoSyncEnabled: enabled }));
  }, []);

  // 手動同期（現在の音楽時間を現在のカウントに同期）
  // カウントを指定しない場合は、最後のマーカーのカウント+1を使用
  const syncCurrentTime = useCallback((currentCount?: number) => {
    if (!audioRef.current) return;
    addMarker(audioRef.current.currentTime, currentCount);
  }, [addMarker]);

  // 音楽を指定カウントにシーク
  const seekToCount = useCallback(
    (count: number) => {
      if (!audioRef.current) return;
      const musicTime = getMusicTimeFromCount(count);
      if (musicTime !== null) {
        audioRef.current.currentTime = musicTime;
        pausedTimeRef.current = musicTime;
        setState((prev) => ({ ...prev, currentTime: musicTime }));
      }
    },
    [getMusicTimeFromCount]
  );

  // 音楽を指定時間にシーク
  const seekToMusicTime = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    pausedTimeRef.current = time;
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  return {
    state,
    loadMusic,
    playMusic,
    stopMusic,
    addMarker,
    removeMarker,
    updateMarker,
    getCountFromMusicTime,
    getMusicTimeFromCount,
    setBPM,
    setPlaybackRate,
    setPlaybackRateFromBPM,
    addTrack,
    removeTrack,
    setTrackVolume,
    setTrackEnabled,
    setAutoSync,
    syncCurrentTime,
    seekToCount,
    seekToMusicTime,
  };
}

