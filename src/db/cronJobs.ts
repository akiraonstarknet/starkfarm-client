import { db } from './index';
import { Prisma } from '@prisma/client';

/**
 * Start tracking a cron job execution
 */
export async function startCronJob(jobName: string, metadata?: any) {
  try {
    const execution = await db.cronJobExecution.create({
      data: {
        jobName,
        status: 'running',
        metadata: (metadata || {}) as unknown as Prisma.JsonObject,
      },
    });

    return execution;
  } catch (error) {
    console.error(`Error starting cron job ${jobName}:`, error);
    throw error;
  }
}

/**
 * Complete a cron job execution
 */
export async function completeCronJob(
  executionId: number,
  status: 'success' | 'failed',
  error?: string,
  metadata?: any,
) {
  try {
    const startedJob = await db.cronJobExecution.findUnique({
      where: { id: executionId },
    });

    if (!startedJob) {
      throw new Error(`Job execution ${executionId} not found`);
    }

    const duration = Date.now() - startedJob.startedAt.getTime();

    const execution = await db.cronJobExecution.update({
      where: { id: executionId },
      data: {
        status,
        completedAt: new Date(),
        duration,
        error,
        metadata: (metadata || {}) as unknown as Prisma.JsonObject,
      },
    });

    return execution;
  } catch (error) {
    console.error(`Error completing cron job ${executionId}:`, error);
    throw error;
  }
}
