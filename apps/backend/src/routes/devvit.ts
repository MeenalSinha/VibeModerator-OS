// ============================================================
// VibeModerator OS — Devvit Integration Routes
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToxicityEngine, SimulationEngine, AIRuleParser, WorkflowEngine } from '@vibemod/ai-engine';
import type { ApiResponse } from '@vibemod/shared';

const prisma = new PrismaClient();
const toxicityEngine = new ToxicityEngine();
const simulator = new SimulationEngine();
const ruleParser = new AIRuleParser();

export const devvitRouter = new Hono();

// Devvit auth middleware (uses API secret, not JWT)
devvitRouter.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const secret = process.env.DEVVIT_API_SECRET;

  if (secret && (!authHeader || authHeader !== `Bearer ${secret}`)) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid Devvit secret' } }, 401);
  }

  await next();
});

// ============================================================
// POST /api/devvit/evaluate — Evaluate content against rules
// ============================================================

const EvaluateSchema = z.object({
  type: z.string(),
  contentId: z.string(),
  contentType: z.enum(['post', 'comment']),
  authorUsername: z.string(),
  subredditId: z.string(),
  subredditName: z.string(),
  content: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    url: z.string().optional(),
    isNsfw: z.boolean().optional(),
    flair: z.string().nullable().optional(),
    parentId: z.string().optional(),
  }),
  author: z.object({
    karma: z.number(),
    accountAge: z.number(),
    isBanned: z.boolean(),
  }),
});

devvitRouter.post('/evaluate', async (c) => {
  let body: z.infer<typeof EvaluateSchema>;
  try {
    body = EvaluateSchema.parse(await c.req.json());
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' } }, 400);
  }

  // Find subreddit
  const subreddit = await prisma.subreddit.findFirst({
    where: { OR: [{ id: body.subredditId }, { name: body.subredditName }] },
  });

  if (!subreddit || !subreddit.autoModerationEnabled) {
    return c.json({ success: true, data: { action: 'approve', confidence: 0, reasoning: 'Auto-moderation disabled' } });
  }

  // Get active rules
  const rules = await prisma.moderationRule.findMany({
    where: { subredditId: subreddit.id, status: 'active' },
    orderBy: { priority: 'asc' },
  });

  // Get active workflows (saved via visual builder)
  const workflows = await prisma.workflow.findMany({
    where: { subredditId: subreddit.id },
  });

  if (rules.length === 0 && workflows.length === 0) {
    return c.json({ success: true, data: { action: 'approve', confidence: 0, reasoning: 'No active rules or workflows' } });
  }

  // Build simulation input
  const simInput = {
    postTitle: body.content.title,
    postBody: body.content.body,
    commentBody: body.contentType === 'comment' ? body.content.body : undefined,
    authorUsername: body.authorUsername,
    authorAccountAge: body.author.accountAge,
    authorKarma: body.author.karma,
    authorIsBanned: body.author.isBanned,
    subredditName: body.subredditName,
    flair: body.content.flair ?? undefined,
    isNsfw: body.content.isNsfw,
    links: body.content.url ? [body.content.url] : [],
  };

  // Run simulation for legacy ModerationRules
  const simResult = await simulator.simulate(simInput, rules as never);

  // Run WorkflowEngine for visual workflows
  const workflowEngine = new WorkflowEngine();
  const workflowActions: string[] = [];
  const workflowTraces: string[] = [];

  for (const wf of workflows) {
    const wfData = {
      nodes: Array.isArray(wf.nodes) ? wf.nodes : [],
      edges: Array.isArray(wf.edges) ? wf.edges : [],
    } as any;
    
    const wfResult = await workflowEngine.execute(wfData, simInput, `${body.contentType}_submit` as 'post_submit' | 'comment_submit');
    workflowActions.push(...wfResult.actions);
    if (wfResult.executionTrace.length > 0) {
      workflowTraces.push(`Workflow [${wf.name}]: ${wfResult.executionTrace.join(' -> ')}`);
    }
  }

  // Run toxicity check in parallel
  const contentText = body.content.title || body.content.body || '';
  const toxicityResult = contentText.length > 10
    ? await toxicityEngine.analyzeContent(contentText, body.contentType)
    : null;

  // Determine final action
  let finalAction: string = 'approve';
  let confidence = simResult.confidence;
  let reasoning = simResult.reasoning;
  let message: string | undefined;

  const allActionsSet = new Set([...simResult.triggeredRules.flatMap(r => r.actions), ...workflowActions]);
  const allActions = Array.from(allActionsSet);

  if (allActions.includes('ban') || allActions.includes('mute')) finalAction = 'remove';
  else if (allActions.includes('remove')) finalAction = 'remove';
  else if (allActions.includes('lock')) finalAction = 'lock';
  else if (allActions.includes('escalate')) finalAction = 'filter';
  else if (allActions.includes('filter') || allActions.includes('queue')) finalAction = 'filter';
  else if (allActions.includes('warn')) {
    finalAction = 'warn';
    message = 'This content may violate community rules. Please review our guidelines.';
  }

  if (workflowTraces.length > 0) {
    reasoning = (reasoning + '\n' + workflowTraces.join('\n')).trim();
    confidence = Math.max(confidence, 0.9); // Workflows are explicit user logic
  }

  // Override with toxicity if critical
  if (toxicityResult && toxicityResult.score > 0.9 && finalAction === 'approve') {
    finalAction = 'remove';
    confidence = toxicityResult.confidence;
    reasoning = `Critical toxicity detected (${Math.round(toxicityResult.score * 100)}%). ${toxicityResult.reasoning}`;
  }

  // Log moderation event
  if (finalAction !== 'approve') {
    await prisma.moderationEvent.create({
      data: {
        subredditId: subreddit.id,
        type: 'rule_triggered',
        contentId: body.contentId,
        contentType: body.contentType,
        authorUsername: body.authorUsername,
        triggeredRuleIds: simResult.triggeredRules.map((r) => r.ruleId) as never,
        appliedActions: [finalAction] as never,
        isAutomated: true,
        timestamp: new Date(),
        metadata: {
          confidence,
          toxicityScore: toxicityResult?.score || 0,
          simulationResult: simResult.result,
        } as never,
      },
    });

    // Update rule stats
    for (const triggered of simResult.triggeredRules) {
      await prisma.moderationRule.update({
        where: { id: triggered.ruleId },
        data: {
          totalMatches: { increment: 1 },
          actionsApplied: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      }).catch(() => null);
    }
  }

  return c.json({
    success: true,
    data: {
      action: finalAction,
      confidence,
      reasoning,
      message,
      ruleId: simResult.triggeredRules[0]?.ruleId,
      toxicityScore: toxicityResult?.score,
      simulationResult: simResult.result,
    },
  });
});

// ============================================================
// POST /api/devvit/analyze — On-demand content analysis
// ============================================================

devvitRouter.post('/analyze', async (c) => {
  const { contentId, contentType, subredditId, content } = await c.req.json() as {
    contentId: string;
    contentType: 'post' | 'comment';
    subredditId: string;
    content?: string;
  };

  const text = content || `[Content ID: ${contentId}]`;
  const analysis = await toxicityEngine.analyzeContent(text, contentType);

  return c.json({
    success: true,
    data: {
      contentId,
      toxicityScore: analysis.score,
      level: analysis.level,
      recommendation: analysis.suggestedAction,
      reasoning: analysis.reasoning,
      categories: analysis.categories,
    },
  });
});

// ============================================================
// POST /api/devvit/events — Ingest events from Devvit
// ============================================================

devvitRouter.post('/events', async (c) => {
  const body = await c.req.json() as {
    type: string;
    contentId: string;
    contentType: string;
    subredditId: string;
    subredditName: string;
    metadata?: Record<string, unknown>;
  };

  const subreddit = await prisma.subreddit.findFirst({
    where: { OR: [{ id: body.subredditId }, { name: body.subredditName }] },
  });

  if (!subreddit) return c.json({ success: true, data: { logged: false } });

  await prisma.moderationEvent.create({
    data: {
      subredditId: subreddit.id,
      type: body.type,
      contentId: body.contentId,
      contentType: body.contentType,
      authorUsername: 'unknown',
      triggeredRuleIds: [] as never,
      appliedActions: [] as never,
      isAutomated: true,
      timestamp: new Date(),
      metadata: (body.metadata || {}) as never,
    },
  });

  return c.json({ success: true, data: { logged: true } });
});

// ============================================================
// POST /api/devvit/traffic — Traffic snapshot for brigade detection
// ============================================================

devvitRouter.post('/traffic', async (c) => {
  const { subredditId, subredditName, newPosts, timestamp } = await c.req.json() as {
    subredditId: string;
    subredditName: string;
    newPosts: number;
    timestamp: string;
  };

  // Store in KV or DB for brigade analysis
  // In production this feeds into BrigadeDetectionEngine
  console.log(`[Traffic] ${subredditName}: ${newPosts} new posts at ${timestamp}`);

  return c.json({ success: true, data: { recorded: true } });
});

// ============================================================
// POST /api/devvit/quick-rule — Create rule suggestion from post
// ============================================================

devvitRouter.post('/quick-rule', async (c) => {
  const { subredditId, subredditName, postTitle, postBody } = await c.req.json() as {
    subredditId: string;
    subredditName: string;
    postTitle: string;
    postBody: string;
  };

  const subreddit = await prisma.subreddit.findFirst({
    where: { OR: [{ id: subredditId }, { name: subredditName }] },
  });

  if (!subreddit) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Subreddit not found' } }, 404);

  const naturalLanguage = `Block posts similar to: "${postTitle}". ${postBody ? `Post body contains: "${postBody.slice(0, 200)}"` : ''}`;

  const parsed = await ruleParser.parseNaturalLanguageRule(naturalLanguage, {
    name: subredditName,
    existingRules: [],
  });

  // Get a system moderator user or first moderator
  const firstMod = await prisma.subredditModerator.findFirst({
    where: { subredditId: subreddit.id },
  });

  if (!firstMod) return c.json({ success: false, error: { code: 'NO_MOD', message: 'No moderators found' } }, 404);

  const rule = await prisma.moderationRule.create({
    data: {
      subredditId: subreddit.id,
      name: parsed.name,
      description: `Auto-generated from post: "${postTitle.slice(0, 80)}"`,
      naturalLanguageInput: naturalLanguage,
      parsedConditions: parsed.parsedConditions as never,
      actions: parsed.actions as never,
      triggers: parsed.triggers as never,
      status: 'draft',
      confidence: parsed.confidence,
      priority: parsed.priority,
      aiExplanation: parsed.metadata.aiExplanation,
      warnings: parsed.metadata.warnings as never,
      conflicts: [] as never,
      optimizationSuggestions: parsed.metadata.optimizationSuggestions as never,
      estimatedFalsePositiveRate: parsed.metadata.estimatedFalsePositiveRate,
      estimatedCoverage: parsed.metadata.estimatedCoverage,
      createdById: firstMod.userId,
    },
  });

  return c.json({ success: true, data: { ruleId: rule.id, ruleName: rule.name, status: 'draft' } });
});
