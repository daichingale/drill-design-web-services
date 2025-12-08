// hooks/useRealtimeSync.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

type SyncMessage = {
  type: string;
  userId: string;
  data: any;
  timestamp: string;
  userName?: string;
  userColor?: string;
};

type UseRealtimeSyncOptions = {
  drillId: string;
  onMessage?: (message: SyncMessage) => void;
  enabled?: boolean;
};

/**
 * リアルタイム同期フック（Server-Sent Eventsを使用）
 */
export function useRealtimeSync({
  drillId,
  onMessage,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const { data: session } = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled) {
      console.log("[RealtimeSync] Sync disabled");
      return;
    }
    
    if (!drillId) {
      console.log("[RealtimeSync] No drillId provided, skipping connection");
      return;
    }
    
    if (!session?.user?.id) {
      console.log("[RealtimeSync] User not authenticated, skipping connection");
      return;
    }

    // 既存の接続を閉じる
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(
        `/api/drills/${drillId}/sync`
      );

      eventSource.onopen = () => {
        console.log("[RealtimeSync] Connected");
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          
          // 自分の変更は無視（無限ループを防ぐ）
          if (message.userId === session.user?.id) {
            return;
          }

          console.log("[RealtimeSync] Received message:", message);
          onMessage?.(message);
        } catch (error) {
          console.error("[RealtimeSync] Failed to parse message:", error);
        }
      };

      eventSource.onerror = (error) => {
        // EventSourceのエラーは通常、エラーオブジェクトを提供しない
        // eventSourceRef.currentを使用して最新の状態を取得
        const currentEventSource = eventSourceRef.current || eventSource;
        if (!currentEventSource) {
          console.error("[RealtimeSync] Connection error: EventSource is null");
          return;
        }

        const readyState = currentEventSource.readyState;
        const readyStateText = readyState === EventSource.CONNECTING ? 'CONNECTING' 
          : readyState === EventSource.OPEN ? 'OPEN' 
          : readyState === EventSource.CLOSED ? 'CLOSED' 
          : 'UNKNOWN';

        // CONNECTING状態でのエラーは、接続が確立される前にエラーが発生したことを意味する
        // これは通常、ネットワークエラーやサーバーエラーが原因
        // この場合は警告レベルでログを出力し、再接続を試みる
        if (readyState === EventSource.CONNECTING) {
          console.warn("[RealtimeSync] Connection failed during initial connection attempt:", {
            drillId,
            userId: session?.user?.id,
            url: currentEventSource.url,
            readyState: readyStateText,
            reconnectAttempt: reconnectAttemptsRef.current,
            message: "接続の確立に失敗しました。再接続を試みます。",
          });
        } else if (readyState === EventSource.CLOSED) {
          // 接続が閉じられた場合
          console.warn("[RealtimeSync] Connection closed:", {
            drillId,
            userId: session?.user?.id,
            url: currentEventSource.url,
            readyState: readyStateText,
            reconnectAttempt: reconnectAttemptsRef.current,
          });
        } else {
          // その他のエラー
          console.error("[RealtimeSync] Connection error:", {
            drillId,
            userId: session?.user?.id,
            url: currentEventSource.url,
            readyState: readyStateText,
            reconnectAttempt: reconnectAttemptsRef.current,
            error: error ? {
              type: error?.constructor?.name,
              message: error instanceof Error ? error.message : String(error),
            } : null,
          });
        }
        
        currentEventSource.close();

        // 再接続を試みる（readyStateがCLOSEDでない場合、または最大試行回数に達していない場合）
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[RealtimeSync] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.warn(
            "[RealtimeSync] Max reconnect attempts reached. Stopping reconnection attempts.",
            JSON.stringify({
              drillId,
              url: currentEventSource.url,
              readyState: errorInfo.readyStateText,
              message: "リアルタイム同期機能が使用できません。単独での編集は引き続き可能です。",
            }, null, 2)
          );
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("[RealtimeSync] Failed to create EventSource:", error);
    }
  }, [drillId, session?.user?.id, enabled, onMessage]);

  useEffect(() => {
    if (enabled && drillId && session?.user?.id) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, drillId, session?.user?.id, connect]);

  return {
    reconnect: connect,
  };
}

