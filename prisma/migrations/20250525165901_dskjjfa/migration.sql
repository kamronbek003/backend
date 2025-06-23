-- CreateTable
CREATE TABLE "MonthlyStatistics" (
    "id" TEXT NOT NULL,
    "whichMonth" TEXT NOT NULL,
    "monthlyStudents" INTEGER NOT NULL DEFAULT 0,
    "monthlyPayment" INTEGER NOT NULL DEFAULT 0,
    "monthlyGroups" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MonthlyStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStatistics_id_key" ON "MonthlyStatistics"("id");
