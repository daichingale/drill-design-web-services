# ドリル学習システム設計

## 📋 概要

ユーザーが作成したドリル（コンテ）を学習させ、よく使う動きパターンや音楽に合わせた動きを自動提案するシステム。

## 🎯 目標

1. **パターン学習**: よく使う動き・隊形パターンを自動抽出
2. **セクション別学習**: 序盤・中盤・終盤の動きの傾向を学習
3. **音楽連動**: BPM・拍・楽曲セクションに合わせた動きを提案
4. **個人最適化**: ユーザーごとの「好みの動き」を学習

## 📊 データ構造

### 1. 学習用ドリルデータ（JSON）

```json
{
  "drillId": "drill-2025-01-28-001",
  "title": "定期演奏会用ドリル",
  "metadata": {
    "createdAt": "2025-01-28T10:00:00Z",
    "createdBy": "user-id",
    "musicFile": "music-001.mp3",
    "musicBPM": 120.0,
    "totalCounts": 128
  },
  "members": [
    {
      "id": "M1",
      "name": "Member 1",
      "part": "Trumpet"
    }
  ],
  "sets": [
    {
      "id": "set-1",
      "startCount": 0,
      "endCount": 16,
      "section": "intro",  // intro, verse, chorus, bridge, outro
      "positions": {
        "M1": { "x": 10.0, "y": 20.0 }
      },
      "formationType": "line",  // line, circle, grid, v, custom
      "features": {
        "symmetry": 0.8,  // 対称性スコア 0-1
        "spread": 5.2,    // 散開度（平均距離）
        "rotation": 0.0   // 回転角度
      }
    }
  ],
  "transitions": [
    {
      "fromSetId": "set-1",
      "toSetId": "set-2",
      "duration": 16,  // カウント数
      "movementType": "expand",  // expand, contract, rotate, cross, wave
      "maxDistance": 8.5,  // 最大移動距離
      "avgDistance": 4.2,  // 平均移動距離
      "rotation": 45.0  // 回転角度
    }
  ],
  "patterns": [
    {
      "type": "line_to_circle",
      "startCount": 0,
      "endCount": 32,
      "memberIds": ["M1", "M2", "M3"],
      "tags": ["intro", "smooth", "symmetric"]
    }
  ]
}
```

### 2. 学習済みパターン（Python側で保存）

```json
{
  "userId": "user-id",
  "patterns": [
    {
      "id": "pattern-001",
      "type": "line_to_circle",
      "frequency": 15,  // 使用回数
      "avgDuration": 16,
      "preferredSections": ["intro", "verse"],
      "preferredBPMRange": [100, 140],
      "tags": ["smooth", "symmetric"],
      "exampleDrillIds": ["drill-001", "drill-003"]
    }
  ],
  "sectionPreferences": {
    "intro": {
      "avgMovementDistance": 3.5,
      "preferredFormations": ["line", "circle"],
      "symmetryScore": 0.85
    },
    "chorus": {
      "avgMovementDistance": 8.2,
      "preferredFormations": ["grid", "v"],
      "symmetryScore": 0.60
    }
  },
  "statistics": {
    "totalDrills": 25,
    "totalSets": 150,
    "avgSetsPerDrill": 6,
    "mostUsedFormation": "line",
    "mostUsedTransition": "expand"
  }
}
```

## 🔧 API設計

### Python側エンドポイント

#### 1. ドリルデータを学習用に保存
```
POST /learning/save-drill
Content-Type: application/json

{
  "drillId": "...",
  "metadata": {...},
  "members": [...],
  "sets": [...],
  "transitions": [...]
}

Response:
{
  "success": true,
  "drillId": "...",
  "patternsExtracted": 5,
  "message": "ドリルを学習データとして保存しました"
}
```

#### 2. パターン分析・統計取得
```
GET /learning/patterns?userId=user-id&section=intro

Response:
{
  "patterns": [...],
  "sectionPreferences": {...},
  "statistics": {...}
}
```

#### 3. 動きパターン提案
```
POST /learning/suggest-pattern
Content-Type: application/json

{
  "currentFormation": {...},
  "targetSection": "chorus",
  "duration": 16,
  "musicBPM": 120,
  "preferences": {
    "movementType": "expand",
    "complexity": "medium"
  }
}

Response:
{
  "suggestions": [
    {
      "patternId": "pattern-001",
      "type": "line_to_circle",
      "confidence": 0.85,
      "positions": {...},
      "reason": "過去の作品でよく使われているパターンです"
    }
  ]
}
```

#### 4. セクション別自動生成
```
POST /learning/generate-section
Content-Type: application/json

{
  "section": "chorus",
  "memberCount": 20,
  "duration": 32,
  "musicBPM": 120,
  "previousFormation": {...}
}

Response:
{
  "formation": {...},
  "transitions": [...],
  "reason": "あなたの過去作品の「中盤」パターンを参考に生成しました"
}
```

## 🎨 UI設計

### 1. 音楽分析パネル（拡張）

既存の`MusicSyncPanel`に以下を追加：

- **音楽解析ボタン**: アップロードした音楽ファイルを解析
  - BPM検出
  - セクション検出（イントロ、Aメロ、Bメロ、サビなど）
  - ビート検出
- **セクション編集**: 検出されたセクションを手動で調整可能
- **マーカー自動生成**: セクションに合わせてカウントマーカーを自動配置

### 2. 学習・提案パネル（新規）

- **学習ボタン**: 現在のドリルを学習データとして保存
- **パターン統計**: よく使う動きパターンの一覧表示
- **セクション別提案**: 
  - 「序盤用に提案」「中盤用に提案」「終盤用に提案」ボタン
  - 現在のフォーメーションから次のフォーメーションを自動生成
- **学習履歴**: 保存したドリル一覧

## 📈 実装フェーズ

### Phase 1: データ保存基盤（今すぐ）
- [x] ドリルデータのJSON構造定義
- [ ] Python側の保存API実装
- [ ] フロントエンドから保存ボタン実装

### Phase 2: 統計・分析（次）
- [ ] パターン抽出ロジック（ルールベース）
- [ ] セクション別統計計算
- [ ] よく使う動きのランキング

### Phase 3: 提案機能（その後）
- [ ] セクション別提案API
- [ ] UI実装（提案ボタン）
- [ ] 生成されたフォーメーションの適用

### Phase 4: 機械学習（将来）
- [ ] 特徴量エンジニアリング
- [ ] モデル学習（kNN / クラスタリング）
- [ ] 予測精度の向上

## 🔍 パターン抽出ロジック（Phase 2）

### 1. フォーメーションタイプ判定
- 円形: 中心からの距離がほぼ等しい
- 直線: 1次元に並んでいる
- グリッド: 2次元に整列
- V字: 中央が前に出ている

### 2. 遷移タイプ判定
- expand: 平均距離が増加
- contract: 平均距離が減少
- rotate: 回転角度が大きい
- cross: 交差する動き
- wave: 波状の動き

### 3. セクション判定
- 音楽ファイルからセクション情報を取得
- または、カウント位置から推定（序盤: 0-30%, 中盤: 30-70%, 終盤: 70-100%）

## 💡 使用例

### ユーザーのワークフロー

1. **音楽をアップロード**
   - 音楽分析パネルでファイルを選択
   - BPM・セクションが自動検出される

2. **ドリルを作成**
   - 通常通りドリルを作成
   - セクション情報が自動的に紐づく

3. **学習に追加**
   - 「このドリルを学習に追加」ボタンをクリック
   - パターンが自動抽出され、学習データとして保存

4. **提案を受け取る**
   - 「中盤用に提案」ボタンをクリック
   - 過去の作品から「中盤でよく使う動き」を提案
   - 提案を適用 or 手動で調整

## 🚀 次のステップ

1. ドリルデータの保存フォーマットを確定
2. Python側の保存APIを実装
3. 音楽分析UIを拡張
4. 学習パネルを実装

