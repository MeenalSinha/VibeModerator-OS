// ============================================================
// VibeModerator OS — Simulate Route
// ============================================================
import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { SimulationEngine, ToxicityEngine } from '@vibemod/ai-engine';
import type { ApiResponse } from '@vibemod/shared';

const prisma = new PrismaClient();
const simulator = new SimulationEngine();
const toxicityEngine = new ToxicityEngine();

export const simulateRouter = new Hono();

const SimulateSchema = z.object({
  subredditId: z.string(),
  input: z.object({
    postTitle: z.string().optional(),
    postBody: z.string().optional(),
    commentBody: z.string().optional(),
    authorUsername: z.string().default('unknown'),
    authorAccountAge: z.number(),
    authorKarma: z.number(),
    authorIsBanned: z.boolean().default(false),
    subredditName: z.string(),
    flair: z.string().optional(),
    isNsfw: z.boolean().optional(),
    links: z.array(z.string()).optional(),
  }),
});

simulateRouter.post('/', async (c) => {
  let body: z.infer<typeof SimulateSchema>;
  try {
    body = SimulateSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } }, 400);
  }

  const rules = await prisma.moderationRule.findMany({
    where: { subredditId: body.subredditId, status: 'active' },
    orderBy: { priority: 'asc' },
  });

  const result = await simulator.simulate(body.input as never, rules as never);

  return c.json<ApiResponse<typeof result>>({
    success: true,
    data: result,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

simulateRouter.post('/edge-cases', async (c) => {
  const { subredditId, count = 5 } = await c.req.json() as { subredditId: string; count?: number };

  const rules = await prisma.moderationRule.findMany({
    where: { subredditId, status: 'active' },
  });

  const edgeCases = await simulator.generateEdgeCases(rules as never, count);

  return c.json<ApiResponse<typeof edgeCases>>({
    success: true,
    data: edgeCases,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

simulateRouter.post('/toxicity', async (c) => {
  const { content, contentType = 'comment' } = await c.req.json() as { content: string; contentType?: 'post' | 'comment' };
  const analysis = await toxicityEngine.analyzeContent(content, contentType);
  return c.json<ApiResponse<typeof analysis>>({
    success: true,
    data: analysis,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});
