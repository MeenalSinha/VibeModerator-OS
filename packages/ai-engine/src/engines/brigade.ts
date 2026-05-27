// ============================================================
// VibeModerator OS — Brigade Detection Engine
// ============================================================

import OpenAI from 'openai';
import type { RaidEvent, RaidIndicator, RaidStatus, ModerationAction } from '@vibemod/shared';
import { generateId } from '@vibemod/shared';

export interface TrafficSnapshot {
  timestamp: Date;
  newPosts: number;
  newComments: number;
  newUsers: number;
  upvoteRate: number;
  reportRate: number;
  uniqueIPs?: number;
}

export interface BrigadeDetectionResult {
  isBrigading: boolean;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: RaidIndicator[];
  recommendedActions: ModerationAction[];
  urgencyScore: number;
  analysis: string;
}

export interface CoordinationPattern {
  type: 'identical_content' | 'timing_pattern' | 'voting_ring' | 'account_cluster';
  users: string[];
  confidence: number;
  evidence: string[];
}

export class BrigadeDetectionEngine {
  private client: OpenAI;
  private baselineTraffic: Map<string, TrafficSnapshot[]> = new Map();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async detectBrigading(
    subredditId: string,
    currentSnapshot: TrafficSnapshot,
    historicalSnapshots: TrafficSnapshot[],
    recentComments: Array<{ content: string; authorUsername: string; timestamp: Date }>
  ): Promise<BrigadeDetectionResult> {
    const indicators: RaidIndicator[] = [];
    let totalConfidence = 0;
    let indicatorCount = 0;

    // Traffic spike analysis
    const trafficAnomaly = this.analyzeTrafficAnomaly(currentSnapshot, historicalSnapshots);
    if (trafficAnomaly.isAnomaly) {
      indicators.push({
        type: 'traffic_spike',
        description: `${trafficAnomaly.multiplier.toFixed(1)}x above normal traffic detected`,
        confidence: trafficAnomaly.confidence,
        dataPoints: [trafficAnomaly],
      });
      totalConfidence += trafficAnomaly.confidence;
      indicatorCount++;
    }

    // New account surge
    const newUserRatio = this.detectNewAccountSurge(currentSnapshot, historicalSnapshots);
    if (newUserRatio.isAnomaly) {
      indicators.push({
        type: 'new_account_surge',
        description: `${newUserRatio.newAccountCount} new accounts active in 10 minutes`,
        confidence: newUserRatio.confidence,
        dataPoints: [newUserRatio],
      });
      totalConfidence += newUserRatio.confidence;
      indicatorCount++;
    }

    // Content coordination detection
    if (recentComments.length >= 5) {
      const coordination = await this.detectCoordinatedContent(recentComments);
      if (coordination.detected) {
        indicators.push({
          type: 'coordinated_comments',
          description: `Coordinated posting pattern across ${coordination.affectedUsers.length} users`,
          confidence: coordination.confidence,
          dataPoints: coordination.patterns,
        });
        totalConfidence += coordination.confidence;
        indicatorCount++;
      }
    }

    const avgConfidence = indicatorCount > 0 ? totalConfidence / indicatorCount : 0;
    const isBrigading = avgConfidence > 0.5 && indicators.length >= 2;

    const severity = this.calculateSeverity(avgConfidence, indicators.length);
    const recommendedActions = this.getRecommendedActions(severity, isBrigading);

    const analysis = isBrigading
      ? await this.generateBrigadeAnalysis(subredditId, indicators, severity)
      : 'Normal traffic patterns detected. No brigading indicators found.';

    return {
      isBrigading,
      confidence: avgConfidence,
      severity,
      indicators,
      recommendedActions,
      urgencyScore: isBrigading ? avgConfidence * (indicators.length / 3) : 0,
      analysis,
    };
  }

  async detectBanEvasion(
    subredditId: string,
    suspectedUser: {
      username: string;
      accountAge: number;
      posts: Array<{ content: string; timestamp: Date }>;
    },
    bannedUsers: Array<{
      username: string;
      posts: Array<{ content: string; timestamp: Date }>;
      bannedAt: Date;
    }>
  ): Promise<{ isSuspected: boolean; confidence: number; matchedUsers: Array<{ username: string; confidence: number; reasons: string[] }> }> {
    if (bannedUsers.length === 0) {
      return { isSuspected: false, confidence: 0, matchedUsers: [] };
    }

    const prompt = `Analyze if this Reddit account might be a ban evasion attempt.

Suspected Account: ${suspectedUser.username} (${suspectedUser.accountAge} days old)
Recent posts: ${JSON.stringify(suspectedUser.posts.slice(0, 5).map((p) => p.content.slice(0, 200)))}

Banned accounts to compare against:
${JSON.stringify(
  bannedUsers.slice(0, 5).map((u) => ({
    username: u.username,
    bannedAt: u.bannedAt,
    posts: u.posts.slice(0, 5).map((p) => p.content.slice(0, 200)),
  }))
)}

Respond with JSON:
{
  "isSuspected": boolean,
  "confidence": 0.0-1.0,
  "matchedUsers": [{ "username": "string", "confidence": 0.0-1.0, "reasons": ["string"] }]
}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a ban evasion detection system. Analyze writing patterns and behavior. Respond with only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content || '{}';
    return JSON.parse(raw) as { isSuspected: boolean; confidence: number; matchedUsers: Array<{ username: string; confidence: number; reasons: string[] }> };
  }

  private analyzeTrafficAnomaly(
    current: TrafficSnapshot,
    historical: TrafficSnapshot[]
  ): { isAnomaly: boolean; multiplier: number; confidence: number } {
    if (historical.length < 3) {
      return { isAnomaly: false, multiplier: 1, confidence: 0 };
    }

    const avgPosts = historical.reduce((sum, s) => sum + s.newPosts, 0) / historical.length;
    const avgComments = historical.reduce((sum, s) => sum + s.newComments, 0) / historical.length;

    const postMultiplier = avgPosts > 0 ? current.newPosts / avgPosts : 1;
    const commentMultiplier = avgComments > 0 ? current.newComments / avgComments : 1;
    const multiplier = Math.max(postMultiplier, commentMultiplier);

    const isAnomaly = multiplier > 2.5;
    const confidence = Math.min(1, (multiplier - 2.5) / 5);

    return { isAnomaly, multiplier, confidence };
  }

  private detectNewAccountSurge(
    current: TrafficSnapshot,
    historical: TrafficSnapshot[]
  ): { isAnomaly: boolean; newAccountCount: number; confidence: number } {
    if (historical.length < 3) {
      return { isAnomaly: false, newAccountCount: 0, confidence: 0 };
    }

    const avgNewUsers = historical.reduce((sum, s) => sum + s.newUsers, 0) / historical.length;
    const ratio = avgNewUsers > 0 ? current.newUsers / avgNewUsers : 1;

    const isAnomaly = ratio > 3 && current.newUsers > 10;
    const confidence = Math.min(1, (ratio - 3) / 7);

    return {
      isAnomaly,
      newAccountCount: current.newUsers,
      confidence: isAnomaly ? confidence : 0,
    };
  }

  private async detectCoordinatedContent(
    comments: Array<{ content: string; authorUsername: string; timestamp: Date }>
  ): Promise<{ detected: boolean; confidence: number; affectedUsers: string[]; patterns: unknown[] }> {
    const prompt = `Detect coordinated posting patterns in these Reddit comments.

Comments: ${JSON.stringify(
      comments.slice(0, 20).map((c) => ({
        user: c.authorUsername,
        content: c.content.slice(0, 200),
        time: c.timestamp.toISOString(),
      }))
    )}

Look for: identical or near-identical content, unusual timing patterns, users posting the same links/phrases.

Respond with JSON: { "detected": boolean, "confidence": 0.0-1.0, "affectedUsers": ["string"], "patterns": [] }`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a coordinated behavior detector. Respond with only JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content || '{}';
      return JSON.parse(raw) as { detected: boolean; confidence: number; affectedUsers: string[]; patterns: unknown[] };
    } catch {
      return { detected: false, confidence: 0, affectedUsers: [], patterns: [] };
    }
  }

  private calculateSeverity(confidence: number, indicatorCount: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = confidence * (1 + indicatorCount * 0.2);
    if (score > 0.85) return 'critical';
    if (score > 0.65) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  private getRecommendedActions(severity: string, isBrigading: boolean): ModerationAction[] {
    if (!isBrigading) return [];

    switch (severity) {
      case 'critical':
        return ['lock', 'restrict', 'report', 'queue'];
      case 'high':
        return ['restrict', 'queue', 'warn'];
      case 'medium':
        return ['queue', 'filter'];
      default:
        return ['queue'];
    }
  }

  private async generateBrigadeAnalysis(
    subredditId: string,
    indicators: RaidIndicator[],
    severity: string
  ): Promise<string> {
    return `Brigade detected with ${severity} severity. ${indicators.length} indicators identified including ${indicators.map((i) => i.type).join(', ')}. Immediate action recommended.`;
  }
}
