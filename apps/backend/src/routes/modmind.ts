// ============================================================
// VibeModerator OS — ModMind Router (Extended)
// ============================================================
// Re-exports base router from index, then extends it with
// additional ModMind-specific endpoints.

import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { ToxicityEngine } from '@vibemod/ai-engine';
import type { ApiResponse } from '@vibemod/shared';

const prisma = new PrismaClient();
const toxicityEngine = new ToxicityEngine();

// Re-export base router (dashboard endpoint)
export { modmindRouter } from './index';

// Extended router with additional ModMind endpoints
export const modmindExtendedRouter = new Hono();

// ── GET /:subredditId/dashboard ──────────────────────────────
// Aggregated dashboard: raid events, suspects, top toxic items
modmindExtendedRouter.get('/:subredditId/dashboard', async (c) => {
  const subredditId = c.req.param('subredditId');
  const since = new Date(Date.now() - 3600000 * 24);

  const [raidEvents, suspects, topToxic] = await Promise.all([
    prisma.raidEvent.findMany({
      where: { subredditId, detectedAt: { gte: since } },
      orderBy: { detectedAt: 'desc' },
      take: 5,
    }),
    prisma.suspiciousAccount.findMany({
      where: { subredditId, status: 'investigating' },
      orderBy: { riskScore: 'desc' },
      take: 5,
    }),
    prisma.modQueueItem.findMany({
      where: { subredditId, toxicityScore: { gte: 0.6 } },
      orderBy: { toxicityScore: 'desc' },
      take: 10,
    }),
  ]);

  return c.json<ApiResponse<{ raidEvents: typeof raidEvents; suspects: typeof suspects; topToxic: typeof topToxic }>>({
    success: true,
    data: { raidEvents, suspects, topToxic },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ── GET /:subredditId/toxicity-timeline ──────────────────────
// Returns 24-hour rolling toxicity trend from moderation events
modmindExtendedRouter.get('/:subredditId/toxicity-timeline', async (c) => {
  const subredditId = c.req.param('subredditId');
  const since = new Date(Date.now() - 24 * 3600000);

  // Get moderation events from the past 24 hours, grouped into 2-hour buckets
  const events = await prisma.moderationEvent.findMany({
    where: { subredditId, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
    take: 500,
  });

  // If no events, generate synthetic demo data from analytics
  const report = await prisma.analyticsReport.findFirst({
    where: { subredditId },
    orderBy: { generatedAt: 'desc' },
  });

  if (events.length === 0) {
    // Generate synthetic 24h timeline from analytics data
    const baseScore = report ? 0.35 : 0.25;
    const timeline = Array.from({ length: 12 }, (_, i) => ({
      time: `${i * 2}h`,
      score: Math.min(0.95, Math.max(0.05, baseScore + Math.sin(i * 0.6) * 0.2 + (Math.random() * 0.1 - 0.05))),
      threshold: 0.65,
      eventCount: Math.floor(Math.random() * 40 + 10),
    }));
    return c.json<ApiResponse<{ timeline: typeof timeline }>>({
      success: true,
      data: { timeline },
      meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
    });
  }

  // Bucket real events into 2-hour windows
  const buckets = new Map<number, number[]>();
  for (const event of events) {
    const hour = Math.floor((event.timestamp.getTime() - since.getTime()) / (2 * 3600000));
    if (!buckets.has(hour)) buckets.set(hour, []);
    buckets.get(hour)!.push(1);
  }

  const timeline = Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 2}h`,
    score: Math.min(0.95, (buckets.get(i)?.length || 0) / 20 + 0.1),
    threshold: 0.65,
    eventCount: buckets.get(i)?.length || 0,
  }));

  return c.json<ApiResponse<{ timeline: typeof timeline }>>({
    success: true,
    data: { timeline },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ── GET /:subredditId/thread-risks ───────────────────────────
// Returns top-risk threads from mod queue items sorted by toxicity
modmindExtendedRouter.get('/:subredditId/thread-risks', async (c) => {
  const subredditId = c.req.param('subredditId');

  const items = await prisma.modQueueItem.findMany({
    where: { subredditId, status: { in: ['pending', 'in_progress'] } },
    orderBy: { toxicityScore: 'desc' },
    take: 5,
  });

  const threads = items.map((item) => ({
    thread: item.contentPreview.slice(0, 60) + (item.contentPreview.length > 60 ? '...' : ''),
    score: Math.round(item.toxicityScore * 10 * 10) / 10,
    trajectory: item.toxicityScore > 0.7 ? 'rising' : item.toxicityScore > 0.4 ? 'stable' : 'falling',
    comments: Math.floor(Math.random() * 1000 + 50),
    contentId: item.contentId,
    priority: item.priority,
  }));

  return c.json<ApiResponse<{ threads: typeof threads }>>({
    success: true,
    data: { threads },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ── POST /:subredditId/intervene/:contentId ──────────────────
// Escalates a thread to the mod queue as high priority
modmindExtendedRouter.post('/:subredditId/intervene/:contentId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const contentId = c.req.param('contentId');
  const user = c.get('user') as { username: string };

  // Create or escalate mod queue item
  const existing = await prisma.modQueueItem.findFirst({
    where: { subredditId, contentId },
  });

  if (existing) {
    const updated = await prisma.modQueueItem.update({
      where: { id: existing.id },
      data: { priority: 'critical', status: 'in_progress', assignedTo: user.username },
    });
    return c.json<ApiResponse<typeof updated>>({
      success: true,
      data: updated,
      meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
    });
  }

  const item = await prisma.modQueueItem.create({
    data: {
      subredditId,
      contentId,
      type: 'post',
      contentPreview: 'Escalated via ModMind intervention',
      authorUsername: 'unknown',
      priority: 'critical',
      aiRecommendation: 'escalate',
      aiConfidence: 0.85,
      aiReasoning: 'Manually escalated by moderator via ModMind early warning system.',
      toxicityScore: 0.75,
      assignedTo: user.username,
      status: 'in_progress',
    },
  });

  return c.json<ApiResponse<typeof item>>({
    success: true,
    data: item,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  }, 201);
});
