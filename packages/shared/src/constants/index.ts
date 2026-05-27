// ============================================================
// VibeModerator OS — Shared Constants
// ============================================================

export const TOXICITY_THRESHOLDS = {
  safe: 0.2,
  low: 0.4,
  medium: 0.6,
  high: 0.8,
  critical: 1.0,
} as const;

export const DEFAULT_SUBREDDIT_SETTINGS = {
  autoModerationEnabled: true,
  aiAssistEnabled: true,
  raidDetectionEnabled: true,
  shadowScopeEnabled: true,
  toxicityThreshold: 0.7,
  slowModeEnabled: false,
  slowModeSeconds: 300,
  postingRestrictions: 'none',
  modQueueEnabled: true,
} as const;

export const RULE_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export const API_ROUTES = {
  AUTH: '/api/v1/auth',
  SUBREDDITS: '/api/v1/subreddits',
  RULES: '/api/v1/rules',
  WORKFLOWS: '/api/v1/workflows',
  SIMULATE: '/api/v1/simulate',
  ANALYTICS: '/api/v1/analytics',
  COPILOT: '/api/v1/copilot',
  MODMIND: '/api/v1/modmind',
  BRIGADE: '/api/v1/brigade',
  SHADOW: '/api/v1/shadow',
  MARKETPLACE: '/api/v1/marketplace',
  MOD_QUEUE: '/api/v1/queue',
  HUB: '/api/v1/hub',
  EVENTS: '/api/v1/events',
  HEALTH: '/api/v1/health',
} as const;

export const CACHE_KEYS = {
  SUBREDDIT_ANALYTICS: (id: string) => `analytics:${id}`,
  SUBREDDIT_RULES: (id: string) => `rules:${id}`,
  TOXICITY_SCORE: (contentId: string) => `toxicity:${contentId}`,
  RAID_STATUS: (subredditId: string) => `raid:${subredditId}`,
  MOD_QUEUE: (subredditId: string) => `queue:${subredditId}`,
  USER_TRUST: (username: string) => `trust:${username}`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
} as const;

export const RATE_LIMITS = {
  COPILOT_MESSAGES_PER_MINUTE: 30,
  RULE_SIMULATIONS_PER_HOUR: 100,
  API_REQUESTS_PER_MINUTE: 200,
} as const;

export const MARKETPLACE_CATEGORIES = [
  'gaming',
  'politics',
  'finance',
  'memes',
  'support',
  'education',
  'nsfw',
  'crypto',
  'marketplace',
  'general',
  'news',
] as const;

export const MODERATION_ACTIONS_LABELS: Record<string, string> = {
  remove: 'Remove Content',
  filter: 'Send to Filter Queue',
  warn: 'Warn User',
  mute: 'Mute User',
  lock: 'Lock Thread',
  report: 'Report to Admins',
  queue: 'Send to Mod Queue',
  restrict: 'Restrict Posting',
  auto_comment: 'Post Auto-Comment',
  auto_flair: 'Apply Flair',
  escalate: 'Escalate to Mods',
  approve: 'Approve Content',
  ban: 'Ban User',
};

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'VibeModerator OS';
