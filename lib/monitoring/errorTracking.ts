// lib/monitoring/errorTracking.ts
// エラートラッキング機能

type ErrorInfo = {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
};

class ErrorTracker {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;

  /**
   * エラーを記録
   */
  trackError(error: Error | unknown, context?: Record<string, any>) {
    // エラーオブジェクトを正規化
    let normalizedError: Error;
    if (error instanceof Error) {
      normalizedError = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      normalizedError = new Error(String(error.message || 'Unknown error'));
    } else {
      normalizedError = new Error(String(error || 'Unknown error'));
    }

    // メッセージが空の場合はデフォルトメッセージを使用
    const message = normalizedError.message || 'Unknown error';
    
    const errorInfo: ErrorInfo = {
      message,
      stack: normalizedError.stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: Date.now(),
      context,
    };

    this.errors.push(errorInfo);
    
    // 最大数を超えたら古いエラーを削除
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // コンソールに出力（開発環境）- 空のオブジェクトを避けるため、メッセージがある場合のみ
    if (process.env.NODE_ENV === 'development' && message) {
      console.error('[ErrorTracker]', errorInfo);
    }

    // 本番環境ではサーバーに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(errorInfo);
    }
  }

  /**
   * サーバーにエラーを送信
   */
  private async sendToServer(errorInfo: ErrorInfo) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo),
      });
    } catch (err) {
      console.error('Failed to send error to server:', err);
    }
  }

  /**
   * 記録されたエラーを取得
   */
  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * エラーをクリア
   */
  clearErrors() {
    this.errors = [];
  }
}

export const errorTracker = new ErrorTracker();

/**
 * グローバルエラーハンドラーを設定
 */
export function setupErrorTracking() {
  if (typeof window === 'undefined') return;

  // 未処理のエラーをキャッチ
  window.addEventListener('error', (event) => {
    // event.errorが存在する場合はそれを使用、そうでない場合はevent.messageからエラーを作成
    const error = event.error || new Error(event.message || 'Unknown error');
    errorTracker.trackError(error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Promise rejectionをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    // event.reasonがErrorインスタンスの場合はそれを使用、そうでない場合は新しいErrorを作成
    let error: Error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
      error = new Error(String(event.reason.message || 'Unhandled promise rejection'));
    } else {
      error = new Error(String(event.reason || 'Unhandled promise rejection'));
    }
    errorTracker.trackError(error, { type: 'unhandledrejection' });
  });
}


