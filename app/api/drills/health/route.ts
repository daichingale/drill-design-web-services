// app/api/drills/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Prismaクライアントのインポートをテスト
    const { prisma } = await import("@/lib/prisma");
    return NextResponse.json({ 
      status: "ok",
      prismaInitialized: !!prisma,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Health] Error:", error);
    return NextResponse.json({ 
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}


