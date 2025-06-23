-- CreateTable
CREATE TABLE "BotUsers" (
    "id" TEXT NOT NULL,
    "phone" "Status" NOT NULL,

    CONSTRAINT "BotUsers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotUsers_id_key" ON "BotUsers"("id");
