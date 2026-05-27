// ============================================================
// VibeModerator OS — Shared Utilities
// ============================================================

import type { ToxicityLevel } from '../types';
import { TOXICITY_THRESHOLDS } from '../constants';

/**
 * Classify a numeric toxicity score into a level label.
 */
export function classifyToxicity(score: number): ToxicityLevel {
  if (score < TOXICITY_THRESHOLDS.safe) return 'safe';
  if (score < TOXICITY_THRESHOLDS.low) return 'low';
  if (score < TOXICITY_THRESHOLDS.medium) return 'medium';
  if (score < TOXICITY_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Generate a unique ID with optional prefix.
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Format a date as a relative human-readable string.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Calculate account age in days from Reddit account creation timestamp.
 */
export function accountAgeDays(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Sanitize user input to prevent injection attacks.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 10000);
}

/**
 * Calculate confidence score as a percentage string.
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Deep merge two objects.
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    const srcVal = source[key];
    const tgtVal = result[key];
    if (
      srcVal &&
      tgtVal &&
      typeof srcVal === 'object' &&
      typeof tgtVal === 'object' &&
      !Array.isArray(srcVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        tgtVal as object,
        srcVal as object
      );
    } else if (srcVal !== undefined) {
      (result as Record<string, unknown>)[key] = srcVal;
    }
  }
  return result;
}

/**
 * Chunk an array into smaller arrays of a given size.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelay * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError!;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute a simple hash for a string (for caching/fingerprinting).
 */
export function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export { TOXICITY_THRESHOLDS };
