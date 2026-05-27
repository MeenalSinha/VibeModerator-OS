// ============================================================
// VibeModerator OS — Rules API Routes
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AIRuleParser, SimulationEngine } from '@vibemod/ai-engine';
import { generateId } from '@vibemod/shared';
import type { ApiResponse, ModerationRule } from '@vibemod/shared';

const prisma = new PrismaClient();
const ruleParser = new AIRuleParser();
const simulator = new SimulationEngine();

export const rulesRouter = new Hono();

// ============================================================
// GET /api/v1/rules/:subredditId — List rules for subreddit
// ============================================================
rulesRouter.get('/:subredditId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const rules = await prisma.moderationRule.findMany({
    where: {
      subredditId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
  });

  const total = await prisma.moderationRule.count({
    where: { subredditId, ...(status ? { status } : {}) },
  });

  return c.json<ApiResponse<{ rules: typeof rules; total: number }>>({
    success: true,
    data: { rules, total },
    meta: {
      total,
      page: Math.floor(offset / limit),
      pageSize: limit,
      hasMore: offset + limit < total,
      requestId: c.get('requestId') as string,
      timestamp: new Date(),
    },
  });
});

// ============================================================
// POST /api/v1/rules/:subredditId/parse — Parse NL rule with AI
// ============================================================

const ParseRuleSchema = z.object({
  naturalLanguage: z.string().min(10).max(2000),
  subredditContext: z
    .object({
      name: z.string(),
      existingRules: z.array(z.string()).optional(),
    })
    .optional(),
});

rulesRouter.post('/:subredditId/parse', async (c) => {
  const subredditId = c.req.param('subredditId');
  let body: z.infer<typeof ParseRuleSchema>;

  try {
    body = ParseRuleSchema.parse(await c.req.json());
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } }, 400);
  }

  // Get existing rule names for conflict detection context
  const existingRules = await prisma.moderationRule.findMany({
    where: { subredditId, status: 'active' },
    select: { name: true },
  });

  const parsed = await ruleParser.parseNaturalLanguageRule(body.naturalLanguage, {
    name: body.subredditContext?.name || 'subreddit',
    existingRules: existingRules.map((r) => r.name),
  });

  return c.json<ApiResponse<typeof parsed>>({
    success: true,
    data: parsed,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// POST /api/v1/rules/:subredditId — Create rule
// ============================================================

const CreateRuleSchema = z.object({
  naturalLanguageInput: z.string().min(5).max(2000),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  parsedConditions: z.array(z.unknown()),
  actions: z.array(z.string()),
  triggers: z.array(z.string()),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  priority: z.number().min(1).max(4).default(3),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

rulesRouter.post('/:subredditId', async (c) => {
  const subredditId = c.req.param('subredditId');
  const user = c.get('user') as { id: string };

  let body: z.infer<typeof CreateRuleSchema>;
  try {
    body = CreateRuleSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid rule data' } }, 400);
  }

  // Check for conflicts
  const existingRules = await prisma.moderationRule.findMany({
    where: { subredditId, status: 'active' },
    select: { id: true, name: true, parsedConditions: true, actions: true },
  });

  const rule = await prisma.moderationRule.create({
    data: {
      subredditId,
      name: body.name || 'New Rule',
      description: body.description || '',
      naturalLanguageInput: body.naturalLanguageInput,
      parsedConditions: body.parsedConditions as never,
      actions: body.actions as never,
      triggers: body.triggers as never,
      status: body.status,
      priority: body.priority,
      confidence: body.confidence || 0.7,
      aiExplanation: (body.metadata?.aiExplanation as string) || '',
      warnings: ((body.metadata?.warnings as string[]) || []) as never,
      conflicts: ((body.metadata?.conflicts as string[]) || []) as never,
      optimizationSuggestions: ((body.metadata?.optimizationSuggestions as string[]) || []) as never,
      estimatedFalsePositiveRate: (body.metadata?.estimatedFalsePositiveRate as number) || 0.05,
      estimatedCoverage: (body.metadata?.estimatedCoverage as number) || 0.7,
      createdById: user.id,
    },
  });

  return c.json<ApiResponse<typeof rule>>({
    success: true,
    data: rule,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  }, 201);
});

// ============================================================
// PATCH /api/v1/rules/:subredditId/:ruleId — Update rule
// ============================================================

const UpdateRuleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  priority: z.number().min(1).max(4).optional(),
  parsedConditions: z.array(z.unknown()).optional(),
  actions: z.array(z.string()).optional(),
  triggers: z.array(z.string()).optional(),
});

rulesRouter.patch('/:subredditId/:ruleId', async (c) => {
  const { subredditId, ruleId } = c.req.param();

  let body: z.infer<typeof UpdateRuleSchema>;
  try {
    body = UpdateRuleSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid update data' } }, 400);
  }

  const existing = await prisma.moderationRule.findFirst({
    where: { id: ruleId, subredditId },
  });

  if (!existing) {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
  }

  const updated = await prisma.moderationRule.update({
    where: { id: ruleId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status && { status: body.status }),
      ...(body.priority && { priority: body.priority }),
      ...(body.parsedConditions && { parsedConditions: body.parsedConditions as never }),
      ...(body.actions && { actions: body.actions as never }),
      ...(body.triggers && { triggers: body.triggers as never }),
    },
  });

  return c.json<ApiResponse<typeof updated>>({
    success: true,
    data: updated,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// DELETE /api/v1/rules/:subredditId/:ruleId — Delete rule
// ============================================================

rulesRouter.delete('/:subredditId/:ruleId', async (c) => {
  const { subredditId, ruleId } = c.req.param();

  const existing = await prisma.moderationRule.findFirst({
    where: { id: ruleId, subredditId },
  });

  if (!existing) {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
  }

  await prisma.moderationRule.update({
    where: { id: ruleId },
    data: { status: 'archived' },
  });

  return c.json<ApiResponse<{ archived: boolean }>>({
    success: true,
    data: { archived: true },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// POST /api/v1/rules/:subredditId/:ruleId/optimize — AI optimize
// ============================================================

rulesRouter.post('/:subredditId/:ruleId/optimize', async (c) => {
  const { subredditId, ruleId } = c.req.param();

  const rule = await prisma.moderationRule.findFirst({
    where: { id: ruleId, subredditId },
  });

  if (!rule) {
    return c.json<ApiResponse<never>>({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
  }

  const result = await ruleParser.optimizeRule(rule as unknown as ModerationRule);

  return c.json<ApiResponse<typeof result>>({
    success: true,
    data: result,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});
