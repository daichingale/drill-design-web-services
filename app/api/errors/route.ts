// app/api/errors/route.ts
// エラートラッキングAPI

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const errorInfo = await request.json();
    
    // エラー情報をログに記録
    console.error('[Error Tracking]', {
      message: errorInfo.message,
      stack: errorInfo.stack,
      url: errorInfo.url,
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      context: errorInfo.context,
    });

    // 本番環境では、エラー追跡サービス（例: Sentry）に送信
    // if (process.env.NODE_ENV === 'production') {
    //   await sendToErrorTrackingService(errorInfo);
    // }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track error:', error);
    return NextResponse.json(
      { error: 'Failed to track error' },
      { status: 500 }
    );
  }
}

// エラートラッキングAPI

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const errorInfo = await request.json();
    
    // エラー情報をログに記録
    console.error('[Error Tracking]', {
      message: errorInfo.message,
      stack: errorInfo.stack,
      url: errorInfo.url,
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      context: errorInfo.context,
    });

    // 本番環境では、エラー追跡サービス（例: Sentry）に送信
    // if (process.env.NODE_ENV === 'production') {
    //   await sendToErrorTrackingService(errorInfo);
    // }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track error:', error);
    return NextResponse.json(
      { error: 'Failed to track error' },
      { status: 500 }
    );
  }
}

