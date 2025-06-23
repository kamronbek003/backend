/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `BotParent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BotParent_phone_key" ON "BotParent"("phone");
