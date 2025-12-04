# Drill Python Service

ドリルデザイン支援のためのPythonバックエンドサービス。

## 🎯 機能

### 音楽分析
- **BPM検出**: 音楽ファイルからBPMを自動検出
- **ビート検出**: ビート位置を自動検出
- **拍子検出**: 拍子を検出（現在は4/4を仮定）
- **セクション検出**: 楽曲の構造（イントロ、Aメロ、Bメロ、サビなど）を検出
- **マーカー自動生成**: 指定した間隔でカウントポイントを自動生成

### フォーメーション生成
- **形状別配置**: 円形、直線、V字、グリッドなどの自動配置
- **パート別配置**: パートごとの人数を考慮した配置（今後実装予定）

### パス最適化
- **移動経路計算**: 現在位置から目標位置への最適な移動経路を計算
- **距離計算**: 総移動距離、最大移動距離を計算

## 🚀 セットアップ

### 前提条件
- Python 3.10以上（Python 3.13以下推奨、3.14は一部ライブラリ未対応）
- pip

### インストール

```bash
# 依存関係のインストール
pip install -e .

# または個別にインストール
pip install fastapi uvicorn python-multipart numpy scipy
```

### 音楽分析の高精度化（オプション）

`librosa`を使った高精度な音楽分析を行う場合：

```bash
# Python 3.13以下で実行
pip install librosa soundfile
```

**注意**: Python 3.14では`librosa`の依存関係（`numba`）が未対応のため、`librosa`は使用できません。その場合は簡易解析が使用されます。

## 🏃 起動

```bash
# 開発モード（自動リロード）
uvicorn app.main:app --reload --port 8000

# または
python -m uvicorn app.main:app --reload --port 8000
```

起動後、以下のURLでアクセスできます：
- API: `http://localhost:8000`
- 自動生成ドキュメント: `http://localhost:8000/docs`
- 代替ドキュメント: `http://localhost:8000/redoc`

## 📡 API エンドポイント

### ヘルスチェック
```
GET /health
```

### 音楽分析
```
POST /music/analyze
Content-Type: multipart/form-data

file: 音楽ファイル（MP3, WAV, M4A, FLACなど）
```

**レスポンス例**:
```json
{
  "bpm": 120.0,
  "beats": [0.0, 0.5, 1.0, 1.5, ...],
  "time_signature": "4/4",
  "duration": 180.5,
  "sections": [...]
}
```

### マーカー生成
```
POST /music/markers
Content-Type: multipart/form-data

file: 音楽ファイル
interval: マーカー間隔（拍数、デフォルト: 4.0）
```

### フォーメーション生成
```
POST /formation/generate
Content-Type: application/json

{
  "member_count": 20,
  "part_distribution": {"trumpet": 10, "trombone": 8, "sax": 2},
  "shape": "circle",  // "circle", "line", "v", "grid"
  "constraints": {}
}
```

### パス最適化
```
POST /path/optimize
Content-Type: application/json

{
  "current_positions": [{"x": 0, "y": 0, "member_id": 1}, ...],
  "target_positions": [{"x": 10, "y": 10, "member_id": 1}, ...],
  "constraints": {}
}
```

## 🔧 環境変数

Next.js側から呼び出す場合は、`.env.local`に以下を設定：

```env
PYTHON_API_URL=http://localhost:8000
```

## 📝 開発メモ

### librosaの制限
- Python 3.14では`numba`が未対応のため、`librosa`は使用不可
- Python 3.13以下を使用するか、`librosa`なしで簡易解析を使用

### 今後の拡張予定
- [ ] より高精度な拍子検出（essentia, madmom使用）
- [ ] 衝突回避アルゴリズムの実装
- [ ] 移動速度の最適化
- [ ] パート別配置の実装
- [ ] AIを使ったフォーメーション最適化

