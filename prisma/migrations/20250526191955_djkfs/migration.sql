-- CreateTable
CREATE TABLE "ParentTelegramChat" (
    "id" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT,
    "lastLoginAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentTelegramChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentTelegramChat_parentPhone_key" ON "ParentTelegramChat"("parentPhone");

-- CreateIndex
CREATE UNIQUE INDEX "ParentTelegramChat_telegramChatId_key" ON "ParentTelegramChat"("telegramChatId");

-- CreateIndex
CREATE INDEX "ParentTelegramChat_parentPhone_idx" ON "ParentTelegramChat"("parentPhone");
