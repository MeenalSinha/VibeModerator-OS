// ============================================================
// VibeModerator OS — Remaining Backend Routes
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { BrigadeDetectionEngine } from '@vibemod/ai-engine';
import { SignJWT } from 'jose';
import type { ApiResponse } from '@vibemod/shared';

const prisma = new PrismaClient();

// ============================================================
// AUTH ROUTER
// ============================================================
export const authRouter = new Hono();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'vibemod-dev-secret-change-in-prod');

authRouter.post('/login', async (c) => {
  // Demo auth — in production integrate with Reddit OAuth2
  const { username } = await c.req.json() as { username: string };

  let user = await prisma.moderatorUser.findUnique({ where: { redditUsername: username } });
  if (!user) {
    user = await prisma.moderatorUser.create({
      data: {
        redditUsername: username,
        redditId: `demo_${username}`,
        preferences: {},
      },
    });
  }

  const memberships = await prisma.subredditModerator.findMany({
    where: { userId: user.id },
    select: { subredditId: true },
  });

  const token = await new SignJWT({
    sub: user.id,
    username: user.redditUsername,
    subreddits: memberships.map((m) => m.subredditId),
    role: 'mod',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return c.json({ success: true, data: { token, user } });
});

authRouter.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  return c.json({ success: true, data: { authenticated: true } });
});

// ============================================================
// SUBREDDITS ROUTER
// ============================================================
export const subredditsRouter = new Hono();

subredditsRouter.get('/', async (c) => {
  const user = c.get('user') as { subreddits: string[] };
  const subreddits = await prisma.subreddit.findMany({
    where: { id: { in: user.subreddits } },
    orderBy: { subscriberCount: 'desc' },
  });
  return c.json<ApiResponse<typeof subreddits>>({
    success: true,
    data: subreddits,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

subredditsRouter.get('/:id', async (c) => {
  const subreddit = await prisma.subreddit.findUnique({ where: { id: c.req.param('id') } });
  if (!subreddit) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Subreddit not found' } }, 404);
  return c.json<ApiResponse<typeof subreddit>>({ success: true, data: subreddit, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

subredditsRouter.patch('/:id/settings', async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  const updated = await prisma.subreddit.update({
    where: { id: c.req.param('id') },
    data: body as never,
  });
  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// WORKFLOWS ROUTER
// ============================================================
export const workflowsRouter = new Hono();

workflowsRouter.get('/:subredditId', async (c) => {
  const workflows = await prisma.workflow.findMany({
    where: { subredditId: c.req.param('subredditId') },
    orderBy: { updatedAt: 'desc' },
  });
  return c.json<ApiResponse<typeof workflows>>({ success: true, data: workflows, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

const WorkflowSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
});

workflowsRouter.post('/:subredditId', async (c) => {
  const user = c.get('user') as { id: string };
  let body: z.infer<typeof WorkflowSchema>;
  try { body = WorkflowSchema.parse(await c.req.json()); } catch { return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid workflow' } }, 400); }

  const workflow = await prisma.workflow.create({
    data: {
      subredditId: c.req.param('subredditId'),
      name: body.name,
      description: body.description || '',
      nodes: body.nodes as never,
      edges: body.edges as never,
      status: body.status,
      createdById: user.id,
    },
  });
  return c.json<ApiResponse<typeof workflow>>({ success: true, data: workflow, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } }, 201);
});

workflowsRouter.patch('/:subredditId/:id', async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  const updated = await prisma.workflow.update({
    where: { id: c.req.param('id') },
    data: { ...body, version: { increment: 1 } } as never,
  });
  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

workflowsRouter.delete('/:subredditId/:id', async (c) => {
  await prisma.workflow.update({ where: { id: c.req.param('id') }, data: { status: 'paused' } });
  return c.json<ApiResponse<{ deleted: boolean }>>({ success: true, data: { deleted: true }, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// BRIGADE ROUTER
// ============================================================
export const brigadeRouter = new Hono();
const brigadeEngine = new BrigadeDetectionEngine();

brigadeRouter.get('/:subredditId/events', async (c) => {
  const events = await prisma.raidEvent.findMany({
    where: { subredditId: c.req.param('subredditId') },
    orderBy: { detectedAt: 'desc' },
    take: 20,
  });
  return c.json<ApiResponse<typeof events>>({ success: true, data: events, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

brigadeRouter.get('/:subredditId/status', async (c) => {
  const active = await prisma.raidEvent.findFirst({
    where: { subredditId: c.req.param('subredditId'), status: { in: ['suspected', 'active'] } },
    orderBy: { detectedAt: 'desc' },
  });
  return c.json<ApiResponse<{ isActive: boolean; event: typeof active }>>({
    success: true,
    data: { isActive: !!active, event: active },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

brigadeRouter.post('/:subredditId/resolve/:eventId', async (c) => {
  const user = c.get('user') as { username: string };
  const updated = await prisma.raidEvent.update({
    where: { id: c.req.param('eventId') },
    data: { status: 'contained', resolvedAt: new Date(), resolvedBy: user.username },
  });
  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// SHADOW (BAN EVASION) ROUTER
// ============================================================
export const shadowRouter = new Hono();

shadowRouter.get('/:subredditId/suspects', async (c) => {
  const suspects = await prisma.suspiciousAccount.findMany({
    where: { subredditId: c.req.param('subredditId') },
    orderBy: [{ riskScore: 'desc' }, { detectedAt: 'desc' }],
    take: 50,
  });
  return c.json<ApiResponse<typeof suspects>>({ success: true, data: suspects, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

shadowRouter.patch('/:subredditId/suspects/:id', async (c) => {
  const body = await c.req.json() as { status?: string; actionTaken?: string };
  const updated = await prisma.suspiciousAccount.update({
    where: { id: c.req.param('id') },
    data: body as never,
  });
  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// MOD QUEUE ROUTER
// ============================================================
export const queueRouter = new Hono();

queueRouter.get('/:subredditId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const status = c.req.query('status') || 'pending';
  const priority = c.req.query('priority');
  const limit = parseInt(c.req.query('limit') || '25');
  const offset = parseInt(c.req.query('offset') || '0');

  const items = await prisma.modQueueItem.findMany({
    where: {
      subredditId,
      status,
      ...(priority ? { priority } : {}),
    },
    orderBy: [
      { priority: 'asc' },
      { reportedAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  const total = await prisma.modQueueItem.count({ where: { subredditId, status } });

  return c.json<ApiResponse<{ items: typeof items; total: number }>>({
    success: true,
    data: { items, total },
    meta: { total, page: Math.floor(offset / limit), pageSize: limit, hasMore: offset + limit < total, requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

queueRouter.patch('/:subredditId/:itemId', async (c) => {
  const user = c.get('user') as { username: string };
  const body = await c.req.json() as { status?: string; resolvedAction?: string; assignedTo?: string };

  const updated = await prisma.modQueueItem.update({
    where: { id: c.req.param('itemId') },
    data: {
      ...body,
      ...(body.status === 'resolved' ? { resolvedAt: new Date(), resolvedBy: user.username } : {}),
    } as never,
  });

  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

queueRouter.post('/:subredditId/bulk-action', async (c) => {
  const user = c.get('user') as { username: string };
  const { itemIds, action } = await c.req.json() as { itemIds: string[]; action: string };

  await prisma.modQueueItem.updateMany({
    where: { id: { in: itemIds }, subredditId: c.req.param('subredditId') },
    data: {
      status: 'resolved',
      resolvedAction: action,
      resolvedAt: new Date(),
      resolvedBy: user.username,
    },
  });

  return c.json<ApiResponse<{ updated: number }>>({ success: true, data: { updated: itemIds.length }, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// HUB (MOD OPS) ROUTER
// ============================================================
export const hubRouter = new Hono();

hubRouter.get('/:subredditId/tasks', async (c) => {
  const subredditId = c.req.param('subredditId');
  const status = c.req.query('status');

  const tasks = await prisma.modTask.findMany({
    where: { subredditId, ...(status ? { status } : {}) },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { assignedTo: { select: { redditUsername: true } }, createdBy: { select: { redditUsername: true } } },
  });

  return c.json<ApiResponse<typeof tasks>>({ success: true, data: tasks, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

const TaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  type: z.enum(['review', 'action', 'investigation', 'report', 'incident']).default('review'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedToId: z.string().optional(),
  dueAt: z.string().optional(),
  linkedItems: z.array(z.unknown()).optional(),
});

hubRouter.post('/:subredditId/tasks', async (c) => {
  const user = c.get('user') as { id: string };
  let body: z.infer<typeof TaskSchema>;
  try { body = TaskSchema.parse(await c.req.json()); } catch { return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid task' } }, 400); }

  const task = await prisma.modTask.create({
    data: {
      subredditId: c.req.param('subredditId'),
      title: body.title,
      description: body.description || '',
      type: body.type,
      priority: body.priority,
      assignedToId: body.assignedToId,
      createdById: user.id,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      linkedItems: (body.linkedItems || []) as never,
      notes: [] as never,
    },
  });

  return c.json<ApiResponse<typeof task>>({ success: true, data: task, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } }, 201);
});

hubRouter.patch('/:subredditId/tasks/:taskId', async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  const updated = await prisma.modTask.update({
    where: { id: c.req.param('taskId') },
    data: {
      ...body,
      ...(body.status === 'done' ? { completedAt: new Date() } : {}),
    } as never,
  });
  return c.json<ApiResponse<typeof updated>>({ success: true, data: updated, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

// ============================================================
// MARKETPLACE ROUTER
// ============================================================
export const marketplaceRouter = new Hono();

marketplaceRouter.get('/', async (c) => {
  const category = c.req.query('category');
  const type = c.req.query('type');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '20');

  const templates = await prisma.marketplaceTemplate.findMany({
    where: {
      isPublic: true,
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { installCount: 'desc' }],
    take: limit,
  });

  return c.json<ApiResponse<typeof templates>>({ success: true, data: templates, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

marketplaceRouter.get('/:id', async (c) => {
  const template = await prisma.marketplaceTemplate.findUnique({ where: { id: c.req.param('id') } });
  if (!template) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } }, 404);
  return c.json<ApiResponse<typeof template>>({ success: true, data: template, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

marketplaceRouter.post('/:id/install', async (c) => {
  const { subredditId } = await c.req.json() as { subredditId: string };
  await prisma.marketplaceTemplate.update({
    where: { id: c.req.param('id') },
    data: { installCount: { increment: 1 } },
  });
  return c.json<ApiResponse<{ installed: boolean; subredditId: string }>>({
    success: true,
    data: { installed: true, subredditId },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// MODMIND ROUTER
// ============================================================
export const modmindRouter = new Hono();

modmindRouter.get('/:subredditId/dashboard', async (c) => {
  const subredditId = c.req.param('subredditId');
  const since = new Date(Date.now() - 3600000 * 24);

  const [raidEvents, suspects, topToxic] = await Promise.all([
    prisma.raidEvent.findMany({ where: { subredditId, detectedAt: { gte: since } }, orderBy: { detectedAt: 'desc' }, take: 5 }),
    prisma.suspiciousAccount.findMany({ where: { subredditId, status: 'investigating' }, orderBy: { riskScore: 'desc' }, take: 5 }),
    prisma.modQueueItem.findMany({ where: { subredditId, toxicityScore: { gte: 0.7 } }, orderBy: { toxicityScore: 'desc' }, take: 10 }),
  ]);

  return c.json<ApiResponse<{ raidEvents: typeof raidEvents; suspects: typeof suspects; topToxic: typeof topToxic }>>({
    success: true,
    data: { raidEvents, suspects, topToxic },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// EVENTS ROUTER
// ============================================================
export const eventsRouter = new Hono();

eventsRouter.get('/:subredditId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const type = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '50');
  const since = c.req.query('since') ? new Date(c.req.query('since')!) : new Date(Date.now() - 7 * 86400000);

  const events = await prisma.moderationEvent.findMany({
    where: { subredditId, timestamp: { gte: since }, ...(type ? { type } : {}) },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json<ApiResponse<typeof events>>({ success: true, data: events, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } });
});

eventsRouter.post('/:subredditId', async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  const event = await prisma.moderationEvent.create({
    data: { subredditId: c.req.param('subredditId'), ...body } as never,
  });
  return c.json<ApiResponse<typeof event>>({ success: true, data: event, meta: { requestId: c.get('requestId') as string, timestamp: new Date() } }, 201);
});
