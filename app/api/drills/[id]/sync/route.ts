// app/api/drills/[id]/sync/route.ts
// Server-Sent Events (SSE) を使用したリアルタイム同期
import { NextRequest } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 接続を管理するMap（本番環境ではRedisなどを使用することを推奨）
const connections = new Map<string, ReadableStreamDefaultController[]>();

// GET: SSE接続を確立
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let drillId: string | undefined;
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    drillId = resolvedParams.id;

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: true,
      },
    });

    if (!drill) {
      console.error("[API] Drill not found for sync:", { drillId, userId: user.id });
      return new Response("Drill not found", { status: 404 });
    }

    const isOwner = drill.userId === user.id;
    const isCollaborator = drill.collaborators?.some(
      (c) => c.userId === user.id
    ) || false;

    if (!isOwner && !isCollaborator) {
      console.error("[API] Unauthorized sync access:", { 
        drillId, 
        userId: user.id, 
        drillOwnerId: drill.userId,
        collaborators: drill.collaborators?.map(c => c.userId) || [],
      });
      return new Response("Unauthorized", { status: 403 });
    }

    console.log("[API] SSE connection established:", {
      drillId,
      userId: user.id,
      isOwner,
      isCollaborator,
    });

    // SSEストリームを作成
    const stream = new ReadableStream({
      start(controller) {
        // 接続を登録
        const connectionId = `${drillId}-${user.id}-${Date.now()}`;
        if (!connections.has(drillId)) {
          connections.set(drillId, []);
        }
        connections.get(drillId)!.push(controller);

        // 接続確認メッセージを送信
        const message = JSON.stringify({
          type: "connected",
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));

        // クライアントが切断した場合の処理
        request.signal.addEventListener("abort", () => {
          const controllers = connections.get(drillId);
          if (controllers) {
            const index = controllers.indexOf(controller);
            if (index > -1) {
              controllers.splice(index, 1);
            }
            if (controllers.length === 0) {
              connections.delete(drillId);
            }
          }
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API] Failed to establish SSE connection:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      drillId: drillId || "unknown",
      url: request.url,
    });
    
    if (error instanceof AuthError) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
}

/**
 * ドリルの変更をすべての接続クライアントにブロードキャスト
 */
export async function broadcastChange(
  drillId: string,
  change: {
    type: string;
    userId: string;
    userName?: string;
    userColor?: string;
    data: any;
    timestamp: string;
  }
) {
  const controllers = connections.get(drillId);
  if (!controllers || controllers.length === 0) {
    return;
  }

  const message = JSON.stringify(change);
  const encoded = new TextEncoder().encode(`data: ${message}\n\n`);

  // すべての接続にメッセージを送信
  controllers.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      console.error("Failed to send message to client:", error);
      // エラーが発生した接続を削除
      const index = controllers.indexOf(controller);
      if (index > -1) {
        controllers.splice(index, 1);
      }
    }
  });

  // 接続がなくなったら削除
  if (controllers.length === 0) {
    connections.delete(drillId);
  }
}

