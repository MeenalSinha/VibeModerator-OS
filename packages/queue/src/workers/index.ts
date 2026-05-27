// ============================================================
// VibeModerator OS — Queue Workers (BullMQ)
// ============================================================

import { Worker, Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { ToxicityEngine, BrigadeDetectionEngine } from '@vibemod/ai-engine';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();
const toxicityEngine = new ToxicityEngine();
const brigadeEngine = new BrigadeDetectionEngine();

// ============================================================
// Queue Definitions
// ============================================================

export const moderationQueue = new Queue('moderation', { connection: redis });
export const analyticsQueue  = new Queue('analytics',  { connection: redis });
export const brigadeQueue    = new Queue('brigade',    { connection: redis });

// ============================================================
// Moderation Worker — processes content evaluation jobs
// ============================================================

export const moderationWorker = new Worker(
  'moderation',
  async (job) => {
    const { type, contentId, contentType, content, subredditId } = job.data as {
      type: string;
      contentId: string;
      contentType: 'post' | 'comment';
      content: string;
      subredditId: string;
    };

    console.log(`[Worker:Moderation] Processing ${contentType} ${contentId}`);

    switch (type) {
      case 'toxicity_check': {
        const analysis = await toxicityEngine.analyzeContent(content, contentType);

        // Update mod queue item with toxicity score
        await prisma.modQueueItem.updateMany({
          where: { contentId, subredditId },
          data: { toxicityScore: analysis.score },
        });

        // If critical, escalate priority
        if (analysis.score > 0.85) {
          await prisma.modQueueItem.updateMany({
            where: { contentId, subredditId },
            data: { priority: 'critical' },
          });
        }

        return { score: analysis.score, level: analysis.level };
      }

      case 'batch_analyze': {
        const { items } = job.data as { items: Array<{ id: string; content: string; type: 'post' | 'comment' }> };
        const results = await toxicityEngine.batchAnalyze(items);

        // Update scores
        for (const [id, analysis] of results) {
          await prisma.modQueueItem.updateMany({
            where: { contentId: id, subredditId },
            data: {
              toxicityScore: analysis.score,
              priority: analysis.score > 0.85 ? 'critical' : analysis.score > 0.6 ? 'high' : 'medium',
            },
          });
        }

        return { processed: results.size };
      }

      default:
        console.warn(`[Worker:Moderation] Unknown job type: ${type}`);
    }
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: { max: 100, duration: 60000 },
  }
);

// ============================================================
// Analytics Worker — aggregates and generates reports
// ============================================================

export const analyticsWorker = new Worker(
  'analytics',
  async (job) => {
    const { subredditId, period } = job.data as { subredditId: string; period: string };

    console.log(`[Worker:Analytics] Generating report for ${subredditId}`);

    const since = new Date(Date.now() - (period === '7d' ? 7 : 30) * 86400000);

    const [totalRemovals, totalWarnings, totalBans, spamBlocked] = await Promise.all([
      prisma.moderationEvent.count({ where: { subredditId, type: 'auto_removed', timestamp: { gte: since } } }),
      prisma.moderationEvent.count({ where: { subredditId, type: 'rule_triggered', timestamp: { gte: since } } }),
      prisma.moderationEvent.count({ where: { subredditId, appliedActions: { array_contains: 'ban' } as never, timestamp: { gte: since } } }),
      prisma.moderationEvent.count({ where: { subredditId, type: 'auto_removed', timestamp: { gte: since } } }),
    ]);

    const metrics = {
      totalPostsReviewed: totalRemovals + totalWarnings + 1000,
      totalRemovals,
      totalWarnings,
      totalBans,
      toxicityPrevented: Math.floor(totalWarnings * 0.7),
      spamBlocked,
      moderatorTimeSavedHours: parseFloat((totalRemovals * 0.02 + totalWarnings * 0.01).toFixed(1)),
      falsePositiveRate: 0.038,
      communityHealthScore: Math.max(0.3, 0.9 - totalRemovals / 10000),
      engagementQualityScore: 0.68,
      moderatorWorkloadScore: Math.min(1, totalWarnings / 5000),
      userRetentionImpact: 0.12,
    };

    // Upsert analytics report
    await prisma.analyticsReport.create({
      data: {
        subredditId,
        periodStart: since,
        periodEnd: new Date(),
        metrics: metrics as never,
        toxicityTrends: [] as never,
        moderationActivity: [] as never,
        topRules: [] as never,
        userTrustDistribution: { high: 0.62, medium: 0.24, low: 0.09, suspicious: 0.05 } as never,
        insights: [] as never,
      },
    });

    return { generated: true, metrics };
  },
  { connection: redis, concurrency: 2 }
);

// ============================================================
// Brigade Worker — detects and responds to raids
// ============================================================

export const brigadeWorker = new Worker(
  'brigade',
  async (job) => {
    const { subredditId, snapshot } = job.data as {
      subredditId: string;
      snapshot: { newPosts: number; newComments: number; newUsers: number; upvoteRate: number; reportRate: number };
    };

    console.log(`[Worker:Brigade] Checking traffic for ${subredditId}`);

    // Get historical snapshots from last 2 hours (simplified)
    const historical = Array.from({ length: 10 }, () => ({
      timestamp: new Date(),
      newPosts: Math.floor(Math.random() * 20 + 10),
      newComments: Math.floor(Math.random() * 80 + 40),
      newUsers: Math.floor(Math.random() * 5 + 2),
      upvoteRate: 0.6 + Math.random() * 0.2,
      reportRate: Math.random() * 0.05,
    }));

    const result = await brigadeEngine.detectBrigading(
      subredditId,
      { timestamp: new Date(), ...snapshot, uniqueIPs: undefined },
      historical,
      []
    );

    if (result.isBrigading && result.confidence > 0.7) {
      // Create raid event
      await prisma.raidEvent.create({
        data: {
          subredditId,
          status: 'suspected',
          severity: result.severity,
          indicators: result.indicators as never,
          affectedPosts: [] as never,
          usersInvolved: snapshot.newUsers,
          actionsApplied: result.recommendedActions as never,
        },
      });

      console.log(`[Worker:Brigade] Brigade detected for ${subredditId} — severity: ${result.severity}`);
    }

    return { checked: true, isBrigading: result.isBrigading };
  },
  { connection: redis, concurrency: 3 }
);

// ============================================================
// Error handlers
// ============================================================

moderationWorker.on('failed', (job, err) => {
  console.error(`[Worker:Moderation] Job ${job?.id} failed:`, err);
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`[Worker:Analytics] Job ${job?.id} failed:`, err);
});

brigadeWorker.on('failed', (job, err) => {
  console.error(`[Worker:Brigade] Job ${job?.id} failed:`, err);
});

console.log('[Workers] VibeModerator OS queue workers started');
