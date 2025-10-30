import { db } from './index';

/**
 * Clean up old portfolio snapshots (keep last 90 days)
 */
export async function cleanupOldPortfolioSnapshots(daysToKeep: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.portfolioSnapshot.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Deleted ${result.count} old portfolio snapshots`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old portfolio snapshots:', error);
    throw error;
  }
}
