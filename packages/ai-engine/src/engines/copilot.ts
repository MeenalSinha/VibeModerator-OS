// ============================================================
// VibeModerator OS — ModGPT Copilot Engine
// ============================================================

import OpenAI from 'openai';
import type { CopilotMessage, CopilotContext, CopilotSuggestedAction } from '@vibemod/shared';
import { generateId } from '@vibemod/shared';

const MODGPT_SYSTEM_PROMPT = `You are ModGPT, an expert AI moderation copilot for Reddit communities inside VibeModerator OS.

You have deep expertise in:
- Reddit community moderation best practices
- Content policy and rule enforcement
- Toxicity detection and de-escalation
- Spam and ban evasion patterns
- Community health analytics
- Automod rule syntax
- Reddit Devvit app development

You can help moderators:
- Summarize mod queues and trending issues
- Explain why content was flagged
- Draft modmail responses professionally
- Generate moderation rules from descriptions
- Explain toxicity patterns and user behavior
- Suggest de-escalation strategies
- Analyze subreddit health trends
- Write reports for mod team handoffs
- Answer questions about Reddit policies

Your responses should be:
- Concise and actionable
- Professional but approachable
- Data-driven when possible
- Always focused on community health

Format responses with clear sections when needed. Never use excessive emojis. Be direct and specific.`;

export interface CopilotResponse {
  message: CopilotMessage;
  suggestedActions: CopilotSuggestedAction[];
  followUpQuestions: string[];
}

export class ModGPTCopilot {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(
    userMessage: string,
    conversationHistory: CopilotMessage[],
    context?: CopilotContext & {
      subredditName?: string;
      queueSummary?: string;
      recentEvents?: string;
      activeRules?: string;
    }
  ): Promise<CopilotResponse> {
    const contextBlock = this.buildContextBlock(context as Record<string, unknown>);

    const systemWithContext = contextBlock
      ? `${MODGPT_SYSTEM_PROMPT}\n\n=== CURRENT CONTEXT ===\n${contextBlock}`
      : MODGPT_SYSTEM_PROMPT;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemWithContext },
      ...conversationHistory
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content: userMessage },
    ];

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.4,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || 'I encountered an error. Please try again.';

    const suggestedActions = this.extractSuggestedActions(content, userMessage);
    const followUpQuestions = this.generateFollowUpQuestions(userMessage, content);

    const assistantMessage: CopilotMessage = {
      id: generateId('msg'),
      role: 'assistant',
      content,
      timestamp: new Date(),
      context,
      actions: suggestedActions,
    };

    return {
      message: assistantMessage,
      suggestedActions,
      followUpQuestions,
    };
  }

  async summarizeModQueue(
    queueItems: Array<{
      type: string;
      contentPreview: string;
      authorUsername: string;
      priority: string;
      aiRecommendation: string;
      toxicityScore: number;
    }>
  ): Promise<string> {
    if (queueItems.length === 0) {
      return 'The moderation queue is currently empty. No pending items require attention.';
    }

    const prompt = `Summarize this moderation queue for a Reddit mod team. Be concise, actionable, and highlight the most critical items.

Queue (${queueItems.length} items):
${JSON.stringify(queueItems.slice(0, 20), null, 2)}

Write a 3-5 sentence summary covering: total items, most critical issues, recommended priorities, and any patterns you notice.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are ModGPT, a Reddit moderation assistant. Be concise and professional.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'Queue summary unavailable.';
  }

  async draftModmailReply(
    originalMessage: string,
    situation: string,
    tone: 'formal' | 'friendly' | 'firm'
  ): Promise<{ subject: string; body: string }> {
    const prompt = `Draft a professional modmail reply for this Reddit moderation situation.

Original message from user: "${originalMessage}"
Situation/context: "${situation}"
Tone: ${tone}

Respond with JSON: { "subject": "string", "body": "string" }
The body should be 2-4 paragraphs. Do not use emojis. Be clear and professional.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a Reddit moderation assistant. Draft modmail replies. Respond with only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content || '{}';
    return JSON.parse(raw) as { subject: string; body: string };
  }

  async explainModerationAction(
    action: string,
    triggeredRules: string[],
    contentPreview: string,
    toxicityScore?: number
  ): Promise<string> {
    const prompt = `Explain why this moderation action was taken on Reddit content.

Action taken: ${action}
Triggered rules: ${triggeredRules.join(', ')}
Content preview: "${contentPreview.slice(0, 500)}"
${toxicityScore !== undefined ? `Toxicity score: ${(toxicityScore * 100).toFixed(0)}%` : ''}

Write a clear, professional explanation (2-3 sentences) that a moderator can use to understand and communicate this decision.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are ModGPT, a Reddit moderation assistant. Explain moderation actions clearly.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'Explanation unavailable.';
  }

  async generateAutomodRule(description: string): Promise<string> {
    const prompt = `Convert this description into a valid Reddit AutoModerator YAML rule:

Description: "${description}"

Return only the YAML rule, no markdown code blocks, no explanations. Use proper AutoModerator syntax.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a Reddit AutoModerator expert. Generate valid YAML rules.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || '# Rule generation failed';
  }

  private buildContextBlock(context?: Record<string, unknown>): string {
    if (!context) return '';

    const parts: string[] = [];
    if (context.subredditName) parts.push(`Subreddit: r/${context.subredditName}`);
    if (context.queueSummary) parts.push(`Queue: ${context.queueSummary}`);
    if (context.recentEvents) parts.push(`Recent events: ${context.recentEvents}`);
    if (context.activeRules) parts.push(`Active rules: ${context.activeRules}`);

    return parts.join('\n');
  }

  private extractSuggestedActions(response: string, userMessage: string): CopilotSuggestedAction[] {
    const actions: CopilotSuggestedAction[] = [];

    const lower = userMessage.toLowerCase();

    if (lower.includes('rule') || lower.includes('spam') || lower.includes('filter')) {
      actions.push({
        type: 'create_rule',
        label: 'Create Rule',
        description: 'Create a new moderation rule based on this discussion',
        payload: { prefillText: userMessage },
      });
    }

    if (lower.includes('queue') || lower.includes('review') || lower.includes('pending')) {
      actions.push({
        type: 'open_queue',
        label: 'Open Queue',
        description: 'View and action the moderation queue',
        payload: {},
      });
    }

    if (lower.includes('analytics') || lower.includes('stats') || lower.includes('trend')) {
      actions.push({
        type: 'view_analytics',
        label: 'View Analytics',
        description: 'Open the analytics dashboard',
        payload: {},
      });
    }

    return actions;
  }

  private generateFollowUpQuestions(userMessage: string, response: string): string[] {
    const lower = (userMessage + ' ' + response).toLowerCase();
    const questions: string[] = [];

    if (lower.includes('rule')) {
      questions.push('Would you like me to simulate how this rule would perform?');
    }
    if (lower.includes('toxicity') || lower.includes('toxic')) {
      questions.push('Want me to show the toxicity trend for this thread?');
    }
    if (lower.includes('spam') || lower.includes('ban')) {
      questions.push('Should I check for related accounts using ShadowScope?');
    }
    if (lower.includes('report') || lower.includes('summary')) {
      questions.push('Would you like me to export this as a moderation report?');
    }

    return questions.slice(0, 3);
  }
}
