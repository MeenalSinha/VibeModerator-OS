// ============================================================
// VibeModerator OS — Copilot API Routes
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ModGPTCopilot } from '@vibemod/ai-engine';
import type { ApiResponse, CopilotMessage } from '@vibemod/shared';

const prisma = new PrismaClient();
const copilot = new ModGPTCopilot();

export const copilotRouter = new Hono();

// ============================================================
// POST /api/v1/copilot/chat — Send message to ModGPT
// ============================================================

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  subredditId: z.string().optional(),
  context: z
    .object({
      subredditName: z.string().optional(),
      queueSummary: z.string().optional(),
      recentEvents: z.string().optional(),
      activeRules: z.string().optional(),
    })
    .optional(),
});

copilotRouter.post('/chat', async (c) => {
  const user = c.get('user') as { id: string };

  let body: z.infer<typeof ChatSchema>;
  try {
    body = ChatSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
      400
    );
  }

  // Load or create session
  let session = body.sessionId
    ? await prisma.copilotSession.findFirst({ where: { id: body.sessionId, userId: user.id } })
    : null;

  if (!session) {
    session = await prisma.copilotSession.create({
      data: {
        userId: user.id,
        subredditId: body.subredditId,
        messages: [] as never,
        context: (body.context || {}) as never,
      },
    });
  }

  const history = (session.messages as unknown as CopilotMessage[]) || [];

  // Build enriched context
  let enrichedContext = body.context || {};
  if (body.subredditId) {
    const queueCount = await prisma.modQueueItem.count({
      where: { subredditId: body.subredditId, status: 'pending' },
    });
    enrichedContext = {
      ...enrichedContext,
      queueSummary: `${queueCount} pending items`,
    };
  }

  const response = await copilot.chat(body.message, history, enrichedContext);

  // Persist messages to session
  const userMessage: CopilotMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: body.message,
    timestamp: new Date(),
  };

  const updatedMessages = [...history, userMessage, response.message];

  await prisma.copilotSession.update({
    where: { id: session.id },
    data: { messages: updatedMessages as never, updatedAt: new Date() },
  });

  return c.json<ApiResponse<{ sessionId: string; message: CopilotMessage; suggestedActions: unknown[]; followUpQuestions: string[] }>>({
    success: true,
    data: {
      sessionId: session.id,
      message: response.message,
      suggestedActions: response.suggestedActions,
      followUpQuestions: response.followUpQuestions,
    },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// GET /api/v1/copilot/sessions — List user sessions
// ============================================================

copilotRouter.get('/sessions', async (c) => {
  const user = c.get('user') as { id: string };

  const sessions = await prisma.copilotSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      subredditId: true,
      createdAt: true,
      updatedAt: true,
      messages: true,
    },
  });

  return c.json<ApiResponse<typeof sessions>>({
    success: true,
    data: sessions,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// POST /api/v1/copilot/summarize-queue — Summarize mod queue
// ============================================================

const SummarizeQueueSchema = z.object({
  subredditId: z.string(),
});

copilotRouter.post('/summarize-queue', async (c) => {
  let body: z.infer<typeof SummarizeQueueSchema>;
  try {
    body = SummarizeQueueSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
      400
    );
  }

  const queueItems = await prisma.modQueueItem.findMany({
    where: { subredditId: body.subredditId, status: { in: ['pending', 'in_progress'] } },
    orderBy: { priority: 'asc' },
    take: 30,
    select: {
      type: true,
      contentPreview: true,
      authorUsername: true,
      priority: true,
      aiRecommendation: true,
      toxicityScore: true,
    },
  });

  const summary = await copilot.summarizeModQueue(queueItems);

  return c.json<ApiResponse<{ summary: string; itemCount: number }>>({
    success: true,
    data: { summary, itemCount: queueItems.length },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// POST /api/v1/copilot/draft-modmail — Draft modmail reply
// ============================================================

const DraftModmailSchema = z.object({
  originalMessage: z.string().max(2000),
  situation: z.string().max(1000),
  tone: z.enum(['formal', 'friendly', 'firm']).default('formal'),
});

copilotRouter.post('/draft-modmail', async (c) => {
  let body: z.infer<typeof DraftModmailSchema>;
  try {
    body = DraftModmailSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
      400
    );
  }

  const draft = await copilot.draftModmailReply(body.originalMessage, body.situation, body.tone);

  return c.json<ApiResponse<typeof draft>>({
    success: true,
    data: draft,
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});

// ============================================================
// POST /api/v1/copilot/generate-automod — Generate AutoMod YAML
// ============================================================

const GenerateAutomodSchema = z.object({
  description: z.string().min(10).max(2000),
});

copilotRouter.post('/generate-automod', async (c) => {
  let body: z.infer<typeof GenerateAutomodSchema>;
  try {
    body = GenerateAutomodSchema.parse(await c.req.json());
  } catch {
    return c.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
      400
    );
  }

  const yaml = await copilot.generateAutomodRule(body.description);

  return c.json<ApiResponse<{ yaml: string }>>({
    success: true,
    data: { yaml },
    meta: { requestId: c.get('requestId') as string, timestamp: new Date() },
  });
});
