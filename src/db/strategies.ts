import { db } from './index';
import { TrovesStrategyAPIResult } from '@/store/troves.atoms';
import { Prisma } from '@prisma/client';

/**
 * Get the latest strategy snapshots from the database
 */
export async function getLatestStrategySnapshots() {
  try {
    // Get the most recent snapshot for each strategy
    const snapshots = await db.$queryRaw<any[]>`
      SELECT DISTINCT ON ("strategyId") *
      FROM "StrategySnapshot"
      ORDER BY "strategyId", "updatedAt" DESC
    `;

    return snapshots;
  } catch (error) {
    console.error('Error fetching strategy snapshots:', error);
    return [];
  }
}

/**
 * Save strategy snapshots to the database
 */
export async function saveStrategySnapshots(
  strategies: TrovesStrategyAPIResult[],
) {
  try {
    const snapshots = strategies.map((strategy) => ({
      strategyId: strategy.id,
      name: strategy.name,
      tvlUsd: strategy.tvlUsd,
      apy: strategy.apy,
      baseApy: strategy.apySplit.baseApy,
      rewardsApy: strategy.apySplit.rewardsApy,
      leverage: strategy.leverage ? String(strategy.leverage) : null,
      riskFactor: strategy.riskFactor,
      status: strategy.status.value,
      statusNumber: strategy.status.number,
      depositTokens: strategy.depositToken as unknown as Prisma.JsonArray,
      contracts: strategy.contract as unknown as Prisma.JsonArray,
      logos: strategy.logos as unknown as Prisma.JsonArray,
      actions: (strategy.actions || []) as unknown as Prisma.JsonArray,
      investmentFlows: (strategy.investmentFlows ||
        []) as unknown as Prisma.JsonArray,
      isAudited: strategy.isAudited,
      auditUrl: strategy.auditUrl,
      apyMethodology: strategy.apyMethodology,
      curator: strategy.curator as unknown as Prisma.JsonObject,
      tags: (strategy.tags || []) as unknown as Prisma.JsonArray,
    }));

    // Create all snapshots
    const result = await db.strategySnapshot.createMany({
      data: snapshots,
    });

    console.log(`Saved ${result.count} strategy snapshots`);
    return result;
  } catch (error) {
    console.error('Error saving strategy snapshots:', error);
    throw error;
  }
}

/**
 * Clean up old snapshots (keep last 30 days)
 */
export async function cleanupOldSnapshots(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.strategySnapshot.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Deleted ${result.count} old snapshots`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old snapshots:', error);
    throw error;
  }
}

/**
 * Convert database snapshot to API result format
 */
export function snapshotToAPIResult(snapshot: any): TrovesStrategyAPIResult {
  return {
    name: snapshot.name,
    id: snapshot.strategyId,
    apy: snapshot.apy,
    apySplit: {
      baseApy: snapshot.baseApy,
      rewardsApy: snapshot.rewardsApy,
    },
    apyMethodology: snapshot.apyMethodology || '',
    depositToken: snapshot.depositTokens as any,
    leverage: snapshot.leverage ? parseFloat(snapshot.leverage) : 0,
    contract: snapshot.contracts as any,
    tvlUsd: snapshot.tvlUsd,
    status: {
      number: snapshot.statusNumber,
      value: snapshot.status,
    },
    riskFactor: snapshot.riskFactor,
    logos: snapshot.logos as string[],
    isAudited: snapshot.isAudited,
    auditUrl: snapshot.auditUrl || undefined,
    actions: snapshot.actions as any,
    investmentFlows: snapshot.investmentFlows as any,
    curator: snapshot.curator as any,
    tags: (snapshot.tags || []) as any,
  };
}
