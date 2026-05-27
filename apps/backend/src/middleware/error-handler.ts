// ============================================================
// VibeModerator OS — Middleware Collection
// ============================================================

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ============================================================
// Rate Limiter (in-memory, production should use Redis)
// ============================================================

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export async function rateLimiter(c: Context, next: Next): Promise<Response | void> {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const key = `rate:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 200;

  const current = requestCounts.get(key);

  if (!current || now > current.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(maxRequests - 1));
    await next();
    return;
  }

  if (current.count >= maxRequests) {
    throw new HTTPException(429, { message: 'Too many requests. Please slow down.' });
  }

  current.count++;
  c.header('X-RateLimit-Limit', String(maxRequests));
  c.header('X-RateLimit-Remaining', String(maxRequests - current.count));
  await next();
}

// ============================================================
// Error Handler
// ============================================================

export function errorHandler(err: Error, c: Context): Response {
  console.error(`[ERROR] ${err.message}`, { stack: err.stack });

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: `HTTP_${err.status}`,
          message: err.message,
        },
      },
      err.status
    );
  }

  if (err.message.includes('Unique constraint')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A resource with that identifier already exists',
        },
      },
      409
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      },
    },
    500
  );
}

// ============================================================
// Request Logger
// ============================================================

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  await next();

  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms rid=${requestId}`);
}

// ============================================================
// Validation helper
// ============================================================

export function validateBody<T>(schema: { parse: (data: unknown) => T }) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new HTTPException(400, { message: 'Invalid JSON body' });
    }

    try {
      const parsed = schema.parse(body);
      c.set('validatedBody', parsed);
    } catch (err) {
      const zodError = err as { errors?: Array<{ message: string; path: string[] }> };
      throw new HTTPException(400, {
        message: zodError.errors
          ? zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : 'Validation failed',
      });
    }

    await next();
  };
}
