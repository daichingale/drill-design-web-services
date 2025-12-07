# テスト・品質保証ガイド

このプロジェクトには包括的なテスト・品質保証機能が実装されています。

## テストの種類

### 1. ユニットテスト

Jestを使用したユニットテストが実装されています。

#### 実行方法

```bash
# すべてのテストを実行
npm run test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

#### テストファイル

- `__tests__/lib/drill/statistics.test.ts` - 統計計算関数のテスト
- `__tests__/lib/drill/math.test.ts` - 数学関数のテスト
- `__tests__/lib/drill/storage.test.ts` - ストレージ関数のテスト

### 2. E2Eテスト

Playwrightを使用したE2Eテストが実装されています。

#### 実行方法

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui

# デバッグモードで実行
npm run test:e2e:debug
```

#### テストファイル

- `e2e/drill-editor.spec.ts` - ドリルエディターの主要ワークフローテスト
- `e2e/performance.spec.ts` - パフォーマンステスト

#### ブラウザ互換性

以下のブラウザでテストが実行されます：
- Chromium (Desktop Chrome)
- Firefox
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### 3. 品質チェック

#### コード品質

```bash
# ESLintでコード品質をチェック
npm run lint
```

#### 総合品質チェック

```bash
# すべての品質チェックを実行（lint + ユニットテスト + E2Eテスト）
npm run quality
```

## パフォーマンス監視

### Web Vitals

以下のメトリクスが自動的に収集されます：
- **LCP (Largest Contentful Paint)**: 最大コンテンツの描画時間
- **FID (First Input Delay)**: 初回入力遅延
- **CLS (Cumulative Layout Shift)**: 累積レイアウトシフト

### カスタムメトリクス

`performanceMonitor`を使用してカスタムメトリクスを記録できます：

```typescript
import { performanceMonitor } from '@/lib/monitoring/performanceMetrics';

// メトリクスを記録
performanceMonitor.recordMetric('operation-duration', 150);

// パフォーマンス測定
const endMeasure = performanceMonitor.startMeasure('my-operation');
// ... 処理 ...
endMeasure();
```

## エラートラッキング

### 自動エラー追跡

グローバルエラーハンドラーが設定されており、以下のエラーが自動的に追跡されます：
- 未処理のJavaScriptエラー
- Promise rejection
- コンポーネントエラー

### 手動エラー追跡

```typescript
import { errorTracker } from '@/lib/monitoring/errorTracking';

try {
  // 処理
} catch (error) {
  errorTracker.trackError(error, { context: 'additional info' });
}
```

### エラーAPI

エラーは `/api/errors` エンドポイントに送信されます（本番環境）。

## CI/CD統合

### GitHub Actions例

```yaml
name: Quality Check
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run quality
```

## ベストプラクティス

1. **テストを書く**: 新機能を追加する際は、必ずテストを追加してください
2. **カバレッジを維持**: コードカバレッジを80%以上に維持することを推奨します
3. **パフォーマンスを監視**: パフォーマンスが重要な操作にはメトリクスを追加してください
4. **エラーを追跡**: エラーが発生した場合は、適切なコンテキスト情報を追加してください


このプロジェクトには包括的なテスト・品質保証機能が実装されています。

## テストの種類

### 1. ユニットテスト

Jestを使用したユニットテストが実装されています。

#### 実行方法

```bash
# すべてのテストを実行
npm run test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

#### テストファイル

- `__tests__/lib/drill/statistics.test.ts` - 統計計算関数のテスト
- `__tests__/lib/drill/math.test.ts` - 数学関数のテスト
- `__tests__/lib/drill/storage.test.ts` - ストレージ関数のテスト

### 2. E2Eテスト

Playwrightを使用したE2Eテストが実装されています。

#### 実行方法

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui

# デバッグモードで実行
npm run test:e2e:debug
```

#### テストファイル

- `e2e/drill-editor.spec.ts` - ドリルエディターの主要ワークフローテスト
- `e2e/performance.spec.ts` - パフォーマンステスト

#### ブラウザ互換性

以下のブラウザでテストが実行されます：
- Chromium (Desktop Chrome)
- Firefox
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### 3. 品質チェック

#### コード品質

```bash
# ESLintでコード品質をチェック
npm run lint
```

#### 総合品質チェック

```bash
# すべての品質チェックを実行（lint + ユニットテスト + E2Eテスト）
npm run quality
```

## パフォーマンス監視

### Web Vitals

以下のメトリクスが自動的に収集されます：
- **LCP (Largest Contentful Paint)**: 最大コンテンツの描画時間
- **FID (First Input Delay)**: 初回入力遅延
- **CLS (Cumulative Layout Shift)**: 累積レイアウトシフト

### カスタムメトリクス

`performanceMonitor`を使用してカスタムメトリクスを記録できます：

```typescript
import { performanceMonitor } from '@/lib/monitoring/performanceMetrics';

// メトリクスを記録
performanceMonitor.recordMetric('operation-duration', 150);

// パフォーマンス測定
const endMeasure = performanceMonitor.startMeasure('my-operation');
// ... 処理 ...
endMeasure();
```

## エラートラッキング

### 自動エラー追跡

グローバルエラーハンドラーが設定されており、以下のエラーが自動的に追跡されます：
- 未処理のJavaScriptエラー
- Promise rejection
- コンポーネントエラー

### 手動エラー追跡

```typescript
import { errorTracker } from '@/lib/monitoring/errorTracking';

try {
  // 処理
} catch (error) {
  errorTracker.trackError(error, { context: 'additional info' });
}
```

### エラーAPI

エラーは `/api/errors` エンドポイントに送信されます（本番環境）。

## CI/CD統合

### GitHub Actions例

```yaml
name: Quality Check
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run quality
```

## ベストプラクティス

1. **テストを書く**: 新機能を追加する際は、必ずテストを追加してください
2. **カバレッジを維持**: コードカバレッジを80%以上に維持することを推奨します
3. **パフォーマンスを監視**: パフォーマンスが重要な操作にはメトリクスを追加してください
4. **エラーを追跡**: エラーが発生した場合は、適切なコンテキスト情報を追加してください

