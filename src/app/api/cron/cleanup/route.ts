import { NextResponse } from 'next/server';
import { cleanupOldSnapshots } from '@/db/strategies';
import { cleanupOldPortfolioSnapshots } from '@/db/portfolio';
import { startCronJob, completeCronJob } from '@/db/cronJobs';

export const maxDuration = 60; // 1 minute
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[CRON] Starting cleanup job');

  let jobExecution;

  try {
    jobExecution = await startCronJob('cleanup');

    // Clean up old data
    const snapshotsDeleted = await cleanupOldSnapshots(30); // Keep 30 days of strategy snapshots
    const portfolioDeleted = await cleanupOldPortfolioSnapshots(90); // Keep 90 days of portfolio history

    const totalDeleted = snapshotsDeleted.count + portfolioDeleted.count;

    await completeCronJob(jobExecution.id, 'success', undefined, {
      snapshotsDeleted: snapshotsDeleted.count,
      portfolioDeleted: portfolioDeleted.count,
      totalDeleted,
    });

    console.log(`[CRON] Cleanup completed: ${totalDeleted} records deleted`);

    return NextResponse.json({
      success: true,
      snapshotsDeleted: snapshotsDeleted.count,
      portfolioDeleted: portfolioDeleted.count,
      totalDeleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON] Error during cleanup:', error);

    if (jobExecution) {
      await completeCronJob(jobExecution.id, 'failed', error.message, {
        error: error.toString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
