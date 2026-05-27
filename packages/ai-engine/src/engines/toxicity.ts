// ============================================================
// VibeModerator OS — Toxicity Detection Engine
// ============================================================

import OpenAI from 'openai';
import type { ToxicityLevel } from '@vibemod/shared';
import { classifyToxicity } from '@vibemod/shared';

export interface ToxicityAnalysis {
  score: number;
  level: ToxicityLevel;
  categories: ToxicityCategories;
  reasoning: string;
  escalationProbability: number;
  suggestedAction: string;
  confidence: number;
}

export interface ToxicityCategories {
  harassment: number;
  hateSpeech: number;
  spam: number;
  violence: number;
  selfHarm: number;
  sexualContent: number;
  misinformation: number;
}

export interface ConversationToxicityTrend {
  threadId: string;
  currentToxicity: number;
  projectedToxicity: number;
  escalationProbability: number;
  dangerScore: number;
  interventionRecommended: boolean;
  suggestedInterventions: string[];
  timeline: ToxicityTimelinePoint[];
}

export interface ToxicityTimelinePoint {
  timestamp: Date;
  score: number;
  commentCount: number;
  event?: string;
}

export class ToxicityEngine {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeContent(content: string, contentType: 'post' | 'comment'): Promise<ToxicityAnalysis> {
    const prompt = `Analyze this Reddit ${contentType} for toxicity and harmful content. Respond ONLY with valid JSON.

Content: "${content.slice(0, 2000)}"

JSON schema:
{
  "score": 0.0-1.0,
  "categories": {
    "harassment": 0.0-1.0,
    "hateSpeech": 0.0-1.0,
    "spam": 0.0-1.0,
    "violence": 0.0-1.0,
    "selfHarm": 0.0-1.0,
    "sexualContent": 0.0-1.0,
    "misinformation": 0.0-1.0
  },
  "reasoning": "one sentence explanation",
  "escalationProbability": 0.0-1.0,
  "suggestedAction": "approve|warn|filter|remove|ban",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a content moderation AI. Analyze content for toxicity accurately and impartially. Respond with only JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(raw) as Omit<ToxicityAnalysis, 'level'>;

      return {
        ...result,
        level: classifyToxicity(result.score),
      };
    } catch {
      // Fallback for API errors
      return {
        score: 0.0,
        level: 'safe',
        categories: {
          harassment: 0,
          hateSpeech: 0,
          spam: 0,
          violence: 0,
          selfHarm: 0,
          sexualContent: 0,
          misinformation: 0,
        },
        reasoning: 'Analysis unavailable',
        escalationProbability: 0,
        suggestedAction: 'approve',
        confidence: 0,
      };
    }
  }

  async analyzeConversationTrajectory(
    threadId: string,
    comments: Array<{ content: string; timestamp: Date; authorUsername: string }>
  ): Promise<ConversationToxicityTrend> {
    if (comments.length === 0) {
      return {
        threadId,
        currentToxicity: 0,
        projectedToxicity: 0,
        escalationProbability: 0,
        dangerScore: 0,
        interventionRecommended: false,
        suggestedInterventions: [],
        timeline: [],
      };
    }

    const commentSummary = comments.slice(-20).map((c) => ({
      content: c.content.slice(0, 200),
      timestamp: c.timestamp.toISOString(),
      author: c.authorUsername,
    }));

    const prompt = `Analyze this Reddit comment thread for toxicity trajectory and escalation risk.

Comments (chronological, last 20): ${JSON.stringify(commentSummary, null, 2)}

Respond with JSON:
{
  "currentToxicity": 0.0-1.0,
  "projectedToxicity": 0.0-1.0,
  "escalationProbability": 0.0-1.0,
  "dangerScore": 0.0-1.0,
  "interventionRecommended": boolean,
  "suggestedInterventions": ["string"]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a conversation trajectory analyzer. Respond with only JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(raw) as Omit<ConversationToxicityTrend, 'threadId' | 'timeline'>;

      return {
        threadId,
        ...result,
        timeline: comments.map((c, i) => ({
          timestamp: c.timestamp,
          score: Math.min(1, (result.currentToxicity / comments.length) * (i + 1) * 1.2),
          commentCount: i + 1,
        })),
      };
    } catch {
      return {
        threadId,
        currentToxicity: 0,
        projectedToxicity: 0,
        escalationProbability: 0,
        dangerScore: 0,
        interventionRecommended: false,
        suggestedInterventions: [],
        timeline: [],
      };
    }
  }

  async batchAnalyze(
    contents: Array<{ id: string; content: string; type: 'post' | 'comment' }>
  ): Promise<Map<string, ToxicityAnalysis>> {
    const results = new Map<string, ToxicityAnalysis>();

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const analyses = await Promise.allSettled(
        batch.map((item) => this.analyzeContent(item.content, item.type))
      );

      analyses.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled' && item) {
          results.set(item.id, result.value);
        }
      });
    }

    return results;
  }
}
