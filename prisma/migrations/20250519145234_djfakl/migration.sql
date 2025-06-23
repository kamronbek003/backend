/*
  Warnings:

  - You are about to drop the `BotUsers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "BotUsers";

-- CreateTable
CREATE TABLE "BotLead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "BotLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotParent" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "BotParent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotLead_id_key" ON "BotLead"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BotParent_id_key" ON "BotParent"("id");
