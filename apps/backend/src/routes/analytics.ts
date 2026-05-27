// ============================================================
// VibeModerator OS — Analytics Route
// ============================================================
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import type { ApiResponse } from '@vibemod/shared';

const prisma = new PrismaClient();
export const analyticsRouter = new Hono();

analyticsRouter.get('/:subredditId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const period = c.req.query('period') || '7d';

  const periodMs = period === '30d' ? 30 * 86400000 : period === '24h' ? 86400000 : 7 * 86400000;
  const since = new Date(Date.now() - periodMs);

  const [report, events, queueStats] = await Promise.all([
    prisma.analyticsReport.findFirst({
      where: { subredditId },
      orderBy: { generatedAt: 'desc' },
    }),
    prisma.moderationEvent.groupBy({
      by: ['type'],
      where: { subredditId, timestamp: { gte: since } },
      _count: { id: true },
    }),
    prisma.modQueueItem.groupBy({
      by: ['status'],
      where: { subredditId, createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  const eventSummary = Object.fromEntries(events.map((e) => [e.type, e._count.id]));
  const queueSummary = Object.fromEntries(queueStats.map((q) => [q.status, q._count.id]));

  return c.json<ApiResponse<{ report: typeof report; eventSummary: typeof eventSummary; queueSummary: typeof queueSummary }>>({
    success: true,
    data: { report, eventSummary, queueSummary },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

analyticsRouter.get('/:subredditId/realtime', async (c) => {
  const subredditId = c.req.param('subredditId');
  const since = new Date(Date.now() - 3600000); // last hour

  const [recentEvents, pendingQueue, raidStatus] = await Promise.all([
    prisma.moderationEvent.count({ where: { subredditId, timestamp: { gte: since } } }),
    prisma.modQueueItem.count({ where: { subredditId, status: 'pending' } }),
    prisma.raidEvent.findFirst({
      where: { subredditId, status: { in: ['suspected', 'active'] } },
      orderBy: { detectedAt: 'desc' },
    }),
  ]);

  return c.json<ApiResponse<{ recentEvents: number; pendingQueue: number; raidActive: boolean; raidSeverity: string | null }>>({
    success: true,
    data: {
      recentEvents,
      pendingQueue,
      raidActive: !!raidStatus,
      raidSeverity: raidStatus?.severity ?? null,
    },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});
