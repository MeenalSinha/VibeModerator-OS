// ============================================================
// VibeModerator OS — Backend Server (Hono)
// ============================================================

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

// Route imports
import { rulesRouter } from './routes/rules';
import { workflowsRouter } from './routes/workflows';
import { simulateRouter } from './routes/simulate';
import { analyticsRouter } from './routes/analytics';
import { copilotRouter } from './routes/copilot';
import { modmindRouter } from './routes/index';
import { modmindExtendedRouter } from './routes/modmind';
import { brigadeRouter } from './routes/brigade';
import { shadowRouter } from './routes/shadow';
import { marketplaceRouter } from './routes/marketplace';
import { queueRouter } from './routes/queue';
import { hubRouter } from './routes/hub';
import { subredditsRouter } from './routes/subreddits';
import { eventsRouter } from './routes/events';
import { authRouter } from './routes/auth';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://vibe-moderator-os-web.vercel.app'
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  })
);
app.use('*', requestLogger);

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      ai: 'ready',
    },
  });
});

// Auth routes (no auth middleware)
app.route('/api/v1/auth', authRouter);

// Protected API routes
app.use('/api/v1/*', authMiddleware);

app.route('/api/v1/subreddits', subredditsRouter);
app.route('/api/v1/rules', rulesRouter);
app.route('/api/v1/workflows', workflowsRouter);
app.route('/api/v1/simulate', simulateRouter);
app.route('/api/v1/analytics', analyticsRouter);
app.route('/api/v1/copilot', copilotRouter);
app.route('/api/v1/modmind', modmindRouter);
app.route('/api/v1/modmind', modmindExtendedRouter);
app.route('/api/v1/brigade', brigadeRouter);
app.route('/api/v1/shadow', shadowRouter);
app.route('/api/v1/marketplace', marketplaceRouter);
app.route('/api/v1/queue', queueRouter);
app.route('/api/v1/hub', hubRouter);
app.route('/api/v1/events', eventsRouter);

// Error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

const PORT = parseInt(process.env.PORT || '8080', 10);

import { serve } from '@hono/node-server';

console.log(`VibeModerator OS Backend starting on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT,
});
