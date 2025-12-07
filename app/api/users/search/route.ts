// app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: ユーザーを検索（メールアドレスで）
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "email parameter is required" },
        { status: 400 }
      );
    }

    const foundUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!foundUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(foundUser);
  } catch (error) {
    console.error("[API] Failed to search user:", error);
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to search user", message: errorMessage },
      { status: 500 }
    );
  }
}
