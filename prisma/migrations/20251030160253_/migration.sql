/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `LuckyWinner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Raffle` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LuckyWinner_userId_winnerId_key";

-- DropIndex
DROP INDEX "Raffle_userId_raffleId_key";

-- CreateTable
CREATE TABLE "StrategySnapshot" (
    "id" SERIAL NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tvlUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseApy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardsApy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leverage" TEXT,
    "riskFactor" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "statusNumber" INTEGER NOT NULL DEFAULT 1,
    "depositTokens" JSONB NOT NULL,
    "contracts" JSONB NOT NULL,
    "logos" JSONB NOT NULL,
    "actions" JSONB,
    "investmentFlows" JSONB,
    "isAudited" BOOLEAN NOT NULL DEFAULT false,
    "auditUrl" TEXT,
    "apyMethodology" TEXT,
    "curator" JSONB,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "totalValueUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strategyHoldings" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronJobExecution" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CronJobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategySnapshot_strategyId_idx" ON "StrategySnapshot"("strategyId");

-- CreateIndex
CREATE INDEX "StrategySnapshot_updatedAt_idx" ON "StrategySnapshot"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySnapshot_strategyId_createdAt_key" ON "StrategySnapshot"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userAddress_timestamp_idx" ON "PortfolioSnapshot"("userAddress", "timestamp");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_timestamp_idx" ON "PortfolioSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "CronJobExecution_jobName_startedAt_idx" ON "CronJobExecution"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "CronJobExecution_status_idx" ON "CronJobExecution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LuckyWinner_userId_key" ON "LuckyWinner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Raffle_userId_key" ON "Raffle"("userId");
