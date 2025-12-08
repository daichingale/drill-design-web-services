// app/api/drills/[id]/branches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: ブランチ一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: true,
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    const isOwner = drill.userId === user.id;
    const isCollaborator = drill.collaborators?.some(
      (c) => c.userId === user.id
    ) || false;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ブランチを取得
    const branches = await prisma.drillBranch.findMany({
      where: { drillId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      branches.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        drillId: b.drillId,
        baseBranchId: b.baseBranchId,
        isCurrent: b.isCurrent,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        userId: b.userId,
        userName: b.user?.name || undefined,
      }))
    );
  } catch (error) {
    console.error("[API] Failed to fetch branches:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch branches",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST: 新しいブランチを作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const drillId = resolvedParams.id;
    const body = await request.json();
    const { name, description, baseBranchId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    // ドリルへのアクセス権限を確認
    const drill = await prisma.drill.findUnique({
      where: { id: drillId },
      include: {
        collaborators: true,
      },
    });

    if (!drill) {
      return NextResponse.json(
        { error: "Drill not found" },
        { status: 404 }
      );
    }

    const isOwner = drill.userId === user.id;
    const isCollaborator = drill.collaborators?.some(
      (c) => c.userId === user.id && c.role === "editor"
    ) || false;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ブランチ名の重複チェック
    const existing = await prisma.drillBranch.findUnique({
      where: {
        drillId_name: {
          drillId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Branch name already exists" },
        { status: 409 }
      );
    }

    // ブランチを作成
    const branch = await prisma.drillBranch.create({
      data: {
        drillId,
        name: name.trim(),
        description: description || null,
        baseBranchId: baseBranchId || null,
        userId: user.id,
        isCurrent: false, // 新規作成時は非アクティブ
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      drillId: branch.drillId,
      baseBranchId: branch.baseBranchId,
      isCurrent: branch.isCurrent,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
      userId: branch.userId,
      userName: branch.user?.name || undefined,
    });
  } catch (error: any) {
    console.error("[API] Failed to create branch:", {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error.code,
    });

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Branch name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create branch",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

