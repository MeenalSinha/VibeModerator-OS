// ============================================================
// VibeModerator OS — Auth Middleware
// ============================================================

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'vibemod-dev-secret-change-in-prod');

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Attach user to context
    c.set('user', {
      id: payload.sub,
      username: payload.username,
      subreddits: payload.subreddits,
      role: payload.role,
    });

    await next();
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const user = c.get('user') as { role: string } | undefined;
    if (!user || user.role !== role) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }
    await next();
  };
}

export function requireSubredditAccess(subredditIdParam = 'subredditId') {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const user = c.get('user') as { subreddits: string[] } | undefined;
    const subredditId = c.req.param(subredditIdParam) || c.req.query(subredditIdParam);

    if (!user || !subredditId) {
      throw new HTTPException(403, { message: 'Subreddit access denied' });
    }

    if (!user.subreddits.includes(subredditId)) {
      throw new HTTPException(403, { message: 'You do not have access to this subreddit' });
    }

    await next();
  };
}
