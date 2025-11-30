-- CreateTable
CREATE TABLE "drills" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "dataName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "nextMove" TEXT NOT NULL DEFAULT '',
    "positions" JSONB NOT NULL,
    "positionsByCount" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "part" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#888888',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sets_drillId_idx" ON "sets"("drillId");

-- CreateIndex
CREATE INDEX "members_drillId_idx" ON "members"("drillId");

-- CreateIndex
CREATE UNIQUE INDEX "members_drillId_memberId_key" ON "members"("drillId", "memberId");

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
