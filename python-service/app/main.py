import io
import tempfile
import os
from typing import Optional

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

# librosaの条件付きインポート（Python 3.14未対応のため）
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    librosa = None

app = FastAPI(title="Drill Python Service", version="0.1.0")


# ==================== 音楽分析 ====================

class MusicAnalysisResult(BaseModel):
    bpm: float
    beats: list[float]
    time_signature: str | None = None
    duration: float | None = None
    sections: list[dict] | None = None  # セクション情報（開始時間、終了時間など）
    tempo_changes: list[dict] | None = None  # テンポ変化（高精度版のみ）
    mode: str  # "quick" or "full"


def _analyze_music_quick(file_path: str) -> MusicAnalysisResult:
    """簡易版: 冒頭30秒のみでBPM検出（高速）"""
    # サンプリングレートを下げて、モノラルで読み込み
    y, sr = librosa.load(file_path, sr=22050, mono=True, duration=30.0)  # 冒頭30秒のみ
    
    # BPM検出（複数の方法を試す）
    bpm = 120.0  # デフォルト値
    beats = np.array([])
    
    try:
        # 方法1: beat_trackを使用
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
        if tempo > 0:
            bpm = float(tempo)
        else:
            # 方法2: tempoを使用（より安定）
            tempo = librosa.beat.tempo(y=y, sr=sr, aggregate=np.median)
            if len(tempo) > 0 and tempo[0] > 0:
                bpm = float(tempo[0])
            else:
                # 方法3: onset_strengthから推定
                onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
                if len(onset_frames) > 1:
                    # オセット間隔からBPMを推定
                    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                    intervals = np.diff(onset_times)
                    if len(intervals) > 0:
                        median_interval = np.median(intervals[intervals > 0])
                        if median_interval > 0:
                            bpm = 60.0 / median_interval
    except Exception as e:
        print(f"[WARNING] BPM検出に失敗、デフォルト値を使用: {e}")
    
    # ビートが空の場合は生成
    if len(beats) == 0:
        beat_duration = 60.0 / bpm
        duration_actual = librosa.get_duration(y=y, sr=sr)
        beats = np.arange(0, duration_actual, beat_duration)
    
    # 拍子検出（簡易版：4/4拍子を仮定）
    time_signature = "4/4"
    
    # 実際のファイル長を取得（解析は30秒だけど、全体の長さは記録）
    full_duration = librosa.get_duration(path=file_path)
    
    return MusicAnalysisResult(
        bpm=bpm,
        beats=beats.tolist() if isinstance(beats, np.ndarray) else beats,
        time_signature=time_signature,
        duration=full_duration,
        sections=None,
        tempo_changes=None,
        mode="quick",
    )


def _analyze_music_full(file_path: str) -> MusicAnalysisResult:
    """高精度版: 全曲を解析、テンポ変化・セクション検出"""
    # サンプリングレートを下げて、モノラルで読み込み
    y, sr = librosa.load(file_path, sr=22050, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    # BPM検出（複数の方法を試す）
    bpm = 120.0  # デフォルト値
    beats = np.array([])
    
    try:
        # 方法1: beat_trackを使用
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
        if tempo > 0:
            bpm = float(tempo)
        else:
            # 方法2: tempoを使用（より安定）
            tempo = librosa.beat.tempo(y=y, sr=sr, aggregate=np.median)
            if len(tempo) > 0 and tempo[0] > 0:
                bpm = float(tempo[0])
            else:
                # 方法3: onset_strengthから推定
                onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
                if len(onset_frames) > 1:
                    # オセット間隔からBPMを推定
                    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                    intervals = np.diff(onset_times)
                    if len(intervals) > 0:
                        median_interval = np.median(intervals[intervals > 0])
                        if median_interval > 0:
                            bpm = 60.0 / median_interval
    except Exception as e:
        print(f"[WARNING] BPM検出に失敗、デフォルト値を使用: {e}")
    
    # ビートが空の場合は生成
    if len(beats) == 0:
        beat_duration = 60.0 / bpm
        beats = np.arange(0, duration, beat_duration)

    # テンポ変化検出（時間窓ごとにテンポを計算）
    tempo_changes = []
    try:
        # 10秒ごとにテンポを計算
        window_size = 10.0  # 秒
        hop_size = 5.0  # 秒（オーバーラップ）
        
        current_time = 0.0
        while current_time < duration:
            end_time = min(current_time + window_size, duration)
            start_frame = librosa.time_to_frames(current_time, sr=sr)
            end_frame = librosa.time_to_frames(end_time, sr=sr)
            
            if end_frame > start_frame:
                y_segment = y[start_frame:end_frame]
                if len(y_segment) > 0:
                    try:
                        tempo_seg, _ = librosa.beat.beat_track(y=y_segment, sr=sr, units="time")
                        if tempo_seg <= 0:
                            # beat_trackが失敗した場合、tempoを使用
                            tempo_seg = librosa.beat.tempo(y=y_segment, sr=sr, aggregate=np.median)
                            if len(tempo_seg) > 0:
                                tempo_seg = tempo_seg[0]
                            else:
                                tempo_seg = bpm  # デフォルト値を使用
                        tempo_changes.append({
                            "time": float(current_time),
                            "bpm": float(tempo_seg) if tempo_seg > 0 else bpm,
                        })
                    except Exception:
                        # このセグメントの検出に失敗した場合はスキップ
                        pass
            
            current_time += hop_size
    except Exception as e:
        print(f"[WARNING] テンポ変化検出に失敗: {e}")
        tempo_changes = None

    # 拍子検出（簡易版：4/4拍子を仮定、後で改善可能）
    time_signature = "4/4"

    # セクション検出
    sections = None
    try:
        # 特徴量を抽出（chroma特徴量を使用）
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        # セグメント検出（特徴量から境界を検出）
        boundaries = librosa.segment.agglomerative(chroma, k=5)
        section_times = librosa.frames_to_time(boundaries, sr=sr)
        sections = [
            {
                "start": float(section_times[i]),
                "end": float(section_times[i + 1]) if i + 1 < len(section_times) else duration,
                "index": i,
            }
            for i in range(len(section_times))
        ]
    except Exception as e:
        print(f"[WARNING] セクション検出に失敗: {e}")

    return MusicAnalysisResult(
        bpm=bpm,
        beats=beats.tolist() if isinstance(beats, np.ndarray) else beats,
        time_signature=time_signature,
        duration=duration,
        sections=sections,
        tempo_changes=tempo_changes,
        mode="full",
    )


def _analyze_music_fallback(file_path: str, mode: str = "quick") -> MusicAnalysisResult:
    """librosaが使えない場合のフォールバック（簡易版）"""
    # ファイルサイズからおおよその長さを推定（非常に簡易的）
    file_size = os.path.getsize(file_path)
    # MP3の場合、おおよそ1MB = 1分と仮定（品質による）
    estimated_duration = file_size / (1024 * 1024) * 60  # 秒

    # デフォルトBPM（後でユーザーが手動調整可能）
    default_bpm = 120.0

    # ビートを生成（4/4拍子を仮定）
    beat_duration = 60.0 / default_bpm
    max_beats = int(estimated_duration / beat_duration) + 1
    if mode == "quick":
        # 簡易版: 30秒分だけ
        max_beats = min(max_beats, int(30.0 / beat_duration) + 1)
    
    beats = [i * beat_duration for i in range(max_beats)]

    return MusicAnalysisResult(
        bpm=default_bpm,
        beats=beats,
        time_signature="4/4",
        duration=estimated_duration,
        sections=None,
        tempo_changes=None if mode == "quick" else [],
        mode=mode,
    )


@app.post("/music/analyze", response_model=MusicAnalysisResult)
async def analyze_music(
    file: UploadFile = File(...),
    mode: str = Form("quick"),  # "quick" or "full"
) -> MusicAnalysisResult:
    """
    音楽ファイルを解析してBPM、ビート、拍子などを検出する。
    
    対応フォーマット: MP3, WAV, M4A, FLAC など
    
    Args:
        file: 音楽ファイル
        mode: "quick" (冒頭30秒のみ、高速) または "full" (全曲解析、テンポ変化検出)
    """
    if mode not in ["quick", "full"]:
        raise HTTPException(status_code=400, detail='modeは"quick"または"full"である必要があります')
    
    tmp_file_path = None
    try:
        # ファイル名チェック
        if not file.filename:
            raise HTTPException(status_code=400, detail="ファイル名が指定されていません")
        
        # アップロードされたファイルを一時ファイルに保存
        suffix = f".{file.filename.split('.')[-1]}" if '.' in file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="空のファイルです")
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        # librosaが使える場合は高精度解析、そうでない場合はフォールバック
        if LIBROSA_AVAILABLE:
            try:
                if mode == "quick":
                    result = _analyze_music_quick(tmp_file_path)
                else:
                    result = _analyze_music_full(tmp_file_path)
            except Exception as e:
                # librosaでの解析に失敗した場合、フォールバックを試す
                print(f"[WARNING] librosa解析に失敗、フォールバックを使用: {e}")
                result = _analyze_music_fallback(tmp_file_path, mode)
        else:
            result = _analyze_music_fallback(tmp_file_path, mode)

        return result

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # よくあるエラーパターンを分かりやすく
        if "No such file" in error_msg or "cannot identify" in error_msg:
            raise HTTPException(status_code=400, detail=f"対応していないファイル形式です: {file.filename}")
        elif "codec" in error_msg.lower() or "decode" in error_msg.lower():
            raise HTTPException(status_code=400, detail=f"ファイルのデコードに失敗しました。別の形式で試してください: {error_msg}")
        else:
            raise HTTPException(status_code=400, detail=f"音楽解析エラー: {error_msg}")
    finally:
        # 一時ファイルを削除
        if tmp_file_path and os.path.exists(tmp_file_path):
            try:
                os.unlink(tmp_file_path)
            except Exception:
                pass  # 削除に失敗しても続行


@app.post("/music/markers")
async def generate_music_markers(
    file: UploadFile = File(...),
    interval: float = 4.0,  # マーカーを何拍ごとに配置するか（デフォルト4拍=1小節）
) -> dict:
    """
    音楽ファイルから自動的にマーカー（カウントポイント）を生成する。
    
    Args:
        file: 音楽ファイル
        interval: マーカー間隔（拍数）
    
    Returns:
        マーカーのリスト（時間位置とカウント番号）
    """
    try:
        # 音楽解析を実行
        analysis = await analyze_music(file)
        bpm = analysis.bpm

        # マーカーを生成
        beat_duration = 60.0 / bpm
        marker_interval = beat_duration * interval

        markers = []
        count = 0
        current_time = 0.0
        max_duration = analysis.duration or 300  # デフォルト最大5分

        while current_time < max_duration:
            markers.append(
                {
                    "time": round(current_time, 2),
                    "count": count,
                    "bpm": bpm,
                }
            )
            current_time += marker_interval
            count += int(interval)

        return {
            "bpm": bpm,
            "markers": markers,
            "total_markers": len(markers),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"マーカー生成エラー: {str(e)}")


# ==================== フォーメーション生成 ====================

class FormationRequest(BaseModel):
    member_count: int
    part_distribution: dict[str, int]  # パートごとの人数 {"trumpet": 10, "trombone": 8, ...}
    shape: str  # "circle", "line", "v", "grid", "custom"
    constraints: Optional[dict] = None  # 追加の制約条件


class Position(BaseModel):
    x: float
    y: float
    member_index: int


class FormationResult(BaseModel):
    positions: list[Position]
    shape: str
    total_members: int


@app.post("/formation/generate", response_model=FormationResult)
async def generate_formation(request: FormationRequest) -> FormationResult:
    """
    指定した条件から最適なフォーメーションを自動生成する。
    
    現在は基本的な形状生成のみ実装。後で最適化アルゴリズムを追加。
    """
    positions = []
    member_index = 0

    # 形状に応じて配置を生成
    if request.shape == "circle":
        # 円形配置
        radius = min(request.member_count * 0.5, 20.0)
        angle_step = 2 * np.pi / request.member_count
        for i in range(request.member_count):
            angle = i * angle_step
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            positions.append(Position(x=float(x), y=float(y), member_index=member_index))
            member_index += 1

    elif request.shape == "line":
        # 直線配置
        spacing = 2.0
        start_x = -(request.member_count - 1) * spacing / 2
        for i in range(request.member_count):
            x = start_x + i * spacing
            positions.append(Position(x=float(x), y=0.0, member_index=member_index))
            member_index += 1

    elif request.shape == "v":
        # V字配置
        spacing = 2.0
        center = request.member_count // 2
        for i in range(request.member_count):
            x = (i - center) * spacing
            y = abs(i - center) * 1.5
            positions.append(Position(x=float(x), y=float(y), member_index=member_index))
            member_index += 1

    elif request.shape == "grid":
        # グリッド配置
        cols = int(np.ceil(np.sqrt(request.member_count)))
        rows = int(np.ceil(request.member_count / cols))
        spacing = 2.5
        start_x = -(cols - 1) * spacing / 2
        start_y = -(rows - 1) * spacing / 2

        for i in range(request.member_count):
            row = i // cols
            col = i % cols
            x = start_x + col * spacing
            y = start_y + row * spacing
            positions.append(Position(x=float(x), y=float(y), member_index=member_index))
            member_index += 1

    else:
        # デフォルト：ランダム配置
        np.random.seed(42)  # 再現性のため
        for i in range(request.member_count):
            x = np.random.uniform(-10, 10)
            y = np.random.uniform(-10, 10)
            positions.append(Position(x=float(x), y=float(y), member_index=member_index))
            member_index += 1

    return FormationResult(
        positions=positions,
        shape=request.shape,
        total_members=request.member_count,
    )


# ==================== パス最適化 ====================

class PathOptimizationRequest(BaseModel):
    current_positions: list[dict]  # [{"x": 0, "y": 0, "member_id": 1}, ...]
    target_positions: list[dict]  # [{"x": 10, "y": 10, "member_id": 1}, ...]
    constraints: Optional[dict] = None  # 移動時間、衝突回避など


class PathPoint(BaseModel):
    x: float
    y: float
    time: float


class Path(BaseModel):
    member_id: int
    points: list[PathPoint]


class PathOptimizationResult(BaseModel):
    paths: list[Path]
    total_distance: float
    max_distance: float


@app.post("/path/optimize", response_model=PathOptimizationResult)
async def optimize_paths(request: PathOptimizationRequest) -> PathOptimizationResult:
    """
    現在位置から目標位置への最適な移動経路を計算する。
    
    現在は直線経路のみ。後で衝突回避、速度最適化などを追加。
    """
    paths = []
    total_distance = 0.0
    max_distance = 0.0

    # 各メンバーの経路を計算
    for i, (current, target) in enumerate(
        zip(request.current_positions, request.target_positions)
    ):
        # 直線経路を生成（簡易版）
        start_x = current["x"]
        start_y = current["y"]
        end_x = target["x"]
        end_y = target["y"]

        # 距離を計算
        distance = np.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
        total_distance += distance
        max_distance = max(max_distance, distance)

        # 経路ポイントを生成（開始点と終了点のみ、後で中間点を追加可能）
        points = [
            PathPoint(x=float(start_x), y=float(start_y), time=0.0),
            PathPoint(x=float(end_x), y=float(end_y), time=1.0),  # 正規化時間
        ]

        member_id = current.get("member_id", i)
        paths.append(Path(member_id=member_id, points=points))

    return PathOptimizationResult(
        paths=paths,
        total_distance=float(total_distance),
        max_distance=float(max_distance),
    )


# ==================== ヘルスチェック ====================

@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "drill-python-service",
        "version": "0.1.0",
        "librosa_available": LIBROSA_AVAILABLE,
        "features": [
            "music-analysis",
            "formation-generation",
            "path-optimization",
        ],
    }


# ==================== 学習システム ====================

try:
    from app.learning import (
        DrillData,
        save_drill_for_learning,
        load_learned_patterns,
    )
    LEARNING_AVAILABLE = True
except ImportError as e:
    LEARNING_AVAILABLE = False
    print(f"Learning module not available: {e}")

if LEARNING_AVAILABLE:
    @app.post("/learning/save-drill")
    async def save_drill(drill_data: DrillData) -> dict:
        """ドリルデータを学習用に保存"""
        try:
            result = save_drill_for_learning(drill_data)
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"学習データ保存エラー: {str(e)}")

    @app.get("/learning/patterns")
    async def get_patterns(user_id: Optional[str] = None) -> dict:
        """学習済みパターンを取得"""
        try:
            patterns = load_learned_patterns(user_id)
            return patterns
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"パターン取得エラー: {str(e)}")
else:
    @app.post("/learning/save-drill")
    async def save_drill(drill_data: dict) -> dict:
        """ドリルデータを学習用に保存（未実装）"""
        raise HTTPException(status_code=503, detail="学習機能は現在利用できません")

    @app.get("/learning/patterns")
    async def get_patterns(user_id: Optional[str] = None) -> dict:
        """学習済みパターンを取得（未実装）"""
        return {
            "patterns": [],
            "sectionPreferences": {},
            "statistics": {"totalDrills": 0, "totalSets": 0, "avgSetsPerDrill": 0}
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
