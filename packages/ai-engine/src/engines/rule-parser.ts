// ============================================================
// VibeModerator OS — AI Rule Parser Engine
// ============================================================

import OpenAI from 'openai';
import type {
  ModerationRule,
  RuleCondition,
  ModerationAction,
  TriggerType,
  RuleMetadata,
} from '@vibemod/shared';
import { generateId } from '@vibemod/shared';

const SYSTEM_PROMPT = `You are the VibeModerator OS rule parsing engine. Your job is to convert natural language moderation rules into structured, executable moderation logic for Reddit communities.

You must respond with a single valid JSON object matching this exact schema:
{
  "name": "string — concise rule name (3-6 words)",
  "description": "string — one sentence description",
  "parsedConditions": [
    {
      "id": "string",
      "type": "account_age | karma_total | karma_post | karma_comment | keyword_match | regex_match | link_domain | flair_text | flair_template | post_type | nsfw_flag | toxicity_score | sentiment_score | raid_probability | spam_confidence | user_history | post_velocity | report_count | time_of_day | day_of_week | user_is_banned | user_is_contributor | title_length | body_length | rate_limit",
      "operator": "equals | not_equals | greater_than | less_than | contains | not_contains | starts_with | ends_with | matches_regex | in_list | not_in_list",
      "value": "string | number | boolean | string[]",
      "negate": false,
      "logicGate": "AND | OR"
    }
  ],
  "actions": ["remove | filter | warn | mute | lock | report | queue | restrict | auto_comment | auto_flair | escalate | approve | ban"],
  "triggers": ["post_submit | comment_submit | report | mod_action | scheduled | vote_threshold | user_join"],
  "confidence": 0.0-1.0,
  "priority": 1-4,
  "aiExplanation": "string — detailed explanation of why the rule works and what it targets",
  "triggers_description": "string — what specifically triggers this rule",
  "actions_description": "string — what actions occur and why",
  "warnings": ["string — potential issues or edge cases"],
  "conflicts": ["string — potential conflicts with other rule types"],
  "optimizationSuggestions": ["string — ways to improve the rule"],
  "estimatedFalsePositiveRate": 0.0-1.0,
  "estimatedCoverage": 0.0-1.0
}

Rules for parsing:
- Account age is in days
- Karma values are integers
- Toxicity/confidence scores are 0.0-1.0 floats
- Use AND logic gate for sequential conditions, OR for alternatives
- Priority 1 is highest (critical), 4 is lowest
- Higher confidence for clearer, more specific rules
- Estimate false positive rates realistically
- Always explain potential edge cases in warnings`;

export interface ParsedRuleResult {
  name: string;
  description: string;
  parsedConditions: RuleCondition[];
  actions: ModerationAction[];
  triggers: TriggerType[];
  confidence: number;
  priority: number;
  metadata: RuleMetadata;
}

export class AIRuleParser {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseNaturalLanguageRule(
    naturalLanguage: string,
    subredditContext?: { name: string; existingRules: string[] }
  ): Promise<ParsedRuleResult> {
    const contextPrompt = subredditContext
      ? `\n\nSubreddit context: r/${subredditContext.name}\nExisting rules: ${subredditContext.existingRules.join(', ')}`
      : '';

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Parse this moderation rule into structured logic:\n\n"${naturalLanguage}"${contextPrompt}\n\nRespond with only valid JSON, no markdown.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('AI rule parser returned empty response');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent) as Record<string, unknown>;
    } catch {
      throw new Error('AI rule parser returned invalid JSON');
    }

    // Map conditions with generated IDs
    const parsedConditions = ((parsed.parsedConditions as RuleCondition[]) || []).map((c) => ({
      ...c,
      id: generateId('cond'),
    }));

    return {
      name: String(parsed.name || 'Untitled Rule'),
      description: String(parsed.description || ''),
      parsedConditions,
      actions: (parsed.actions as ModerationAction[]) || [],
      triggers: (parsed.triggers as TriggerType[]) || ['post_submit', 'comment_submit'],
      confidence: Number(parsed.confidence || 0.7),
      priority: Number(parsed.priority || 3),
      metadata: {
        aiExplanation: String(parsed.aiExplanation || ''),
        triggers: [String(parsed.triggers_description || '')],
        warnings: (parsed.warnings as string[]) || [],
        conflicts: (parsed.conflicts as string[]) || [],
        optimizationSuggestions: (parsed.optimizationSuggestions as string[]) || [],
        estimatedFalsePositiveRate: Number(parsed.estimatedFalsePositiveRate || 0.05),
        estimatedCoverage: Number(parsed.estimatedCoverage || 0.7),
      },
    };
  }

  async detectRuleConflicts(
    newRule: Partial<ModerationRule>,
    existingRules: Partial<ModerationRule>[]
  ): Promise<{ hasConflicts: boolean; conflicts: string[]; suggestions: string[] }> {
    if (existingRules.length === 0) {
      return { hasConflicts: false, conflicts: [], suggestions: [] };
    }

    const prompt = `Analyze this new moderation rule for conflicts with existing rules:

New Rule: ${JSON.stringify(newRule, null, 2)}

Existing Rules: ${JSON.stringify(
      existingRules.map((r) => ({ name: r.name, conditions: r.parsedConditions, actions: r.actions })),
      null,
      2
    )}

Respond with JSON: { "hasConflicts": boolean, "conflicts": string[], "suggestions": string[] }`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a moderation rule conflict analyzer. Respond with only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    return JSON.parse(rawContent) as { hasConflicts: boolean; conflicts: string[]; suggestions: string[] };
  }

  async optimizeRule(rule: ModerationRule): Promise<{ suggestions: string[]; optimizedConditions?: RuleCondition[] }> {
    const prompt = `Analyze this moderation rule and suggest optimizations to reduce false positives and improve accuracy:

Rule: ${JSON.stringify(rule, null, 2)}

Respond with JSON: { "suggestions": string[], "optimizedConditions": RuleCondition[] | null }`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a moderation rule optimizer. Respond with only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    return JSON.parse(rawContent) as { suggestions: string[]; optimizedConditions?: RuleCondition[] };
  }
}
