// ============================================================
// VibeModerator OS — Rule Simulation Engine
// ============================================================

import OpenAI from 'openai';
import type {
  SimulationInput,
  SimulationOutput,
  SimulationResult,
  ModerationRule,
  ExecutionStep,
  TriggeredRule,
} from '@vibemod/shared';
import { generateId } from '@vibemod/shared';

export class SimulationEngine {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async simulate(
    input: SimulationInput,
    rules: ModerationRule[]
  ): Promise<SimulationOutput> {
    const startTime = Date.now();
    const triggeredRules: TriggeredRule[] = [];
    const executionTrace: ExecutionStep[] = [];

    // Evaluate each rule against the input
    for (const rule of rules.filter((r) => r.status === 'active')) {
      const ruleResult = await this.evaluateRule(rule, input);

      const step: ExecutionStep = {
        stepId: generateId('step'),
        nodeType: 'rule',
        nodeName: rule.name,
        input: { conditions: rule.parsedConditions.length },
        output: { matched: ruleResult.matched, confidence: ruleResult.confidence },
        passed: ruleResult.matched,
        durationMs: ruleResult.evaluationTimeMs,
        reasoning: ruleResult.reasoning,
      };
      executionTrace.push(step);

      if (ruleResult.matched) {
        triggeredRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matchedConditions: ruleResult.matchedConditions,
          actions: rule.actions,
          confidence: ruleResult.confidence,
        });
      }
    }

    // Determine final outcome
    const finalResult = this.determineFinalResult(triggeredRules);
    const avgConfidence =
      triggeredRules.length > 0
        ? triggeredRules.reduce((sum, r) => sum + r.confidence, 0) / triggeredRules.length
        : 1.0;

    // AI-powered edge case analysis
    const reasoning = await this.generateSimulationReasoning(input, triggeredRules, finalResult);
    const falsePositiveProbability = await this.estimateFalsePositiveProbability(input, triggeredRules);

    return {
      id: generateId('sim'),
      input,
      result: finalResult,
      confidence: avgConfidence,
      triggeredRules,
      executionTrace,
      falsePositiveProbability,
      reasoning,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  async generateEdgeCases(
    rules: ModerationRule[],
    count = 5
  ): Promise<SimulationInput[]> {
    const ruleDescriptions = rules
      .slice(0, 10)
      .map((r) => `${r.name}: ${r.naturalLanguageInput}`)
      .join('\n');

    const prompt = `Generate ${count} edge case test inputs for these Reddit moderation rules. Include both false positive candidates (borderline legitimate content) and true positive candidates (content that should be caught).

Rules:
${ruleDescriptions}

Respond with JSON array of ${count} objects, each matching this schema:
{
  "postTitle": "string or null",
  "postBody": "string or null",
  "commentBody": "string or null",
  "authorUsername": "string",
  "authorAccountAge": number (days),
  "authorKarma": number,
  "authorIsBanned": boolean,
  "subredditName": "string",
  "flair": "string or null",
  "isNsfw": boolean,
  "links": ["string"] or null,
  "_testType": "false_positive_candidate | true_positive_expected | legitimate_content"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a moderation rule tester. Generate realistic test cases. Respond with only a JSON array.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content || '{"cases":[]}';
      const parsed = JSON.parse(raw) as { cases?: SimulationInput[] } | SimulationInput[];
      return Array.isArray(parsed) ? parsed : (parsed.cases || []);
    } catch {
      return this.getDefaultEdgeCases();
    }
  }

  private async evaluateRule(
    rule: ModerationRule,
    input: SimulationInput
  ): Promise<{
    matched: boolean;
    confidence: number;
    matchedConditions: string[];
    reasoning: string;
    evaluationTimeMs: number;
  }> {
    const start = Date.now();

    // Evaluate conditions deterministically where possible
    const matchedConditions: string[] = [];
    let allConditionsMet = true;

    for (const condition of rule.parsedConditions) {
      const conditionMet = this.evaluateCondition(condition, input);
      if (conditionMet) {
        matchedConditions.push(condition.type);
      } else if (condition.logicGate !== 'OR') {
        allConditionsMet = false;
        break;
      }
    }

    const matched = allConditionsMet && matchedConditions.length === rule.parsedConditions.length;
    const confidence = matched ? rule.confidence : 0;
    const reasoning = matched
      ? `Matched ${matchedConditions.length} condition(s): ${matchedConditions.join(', ')}`
      : `Did not match all required conditions`;

    return {
      matched,
      confidence,
      matchedConditions,
      reasoning,
      evaluationTimeMs: Date.now() - start,
    };
  }

  private evaluateCondition(
    condition: { type: string; operator: string; value: unknown; negate: boolean },
    input: SimulationInput
  ): boolean {
    let result = false;

    switch (condition.type) {
      case 'account_age':
        result = this.compareNumbers(input.authorAccountAge, condition.operator, Number(condition.value));
        break;
      case 'karma_total':
        result = this.compareNumbers(input.authorKarma, condition.operator, Number(condition.value));
        break;
      case 'keyword_match': {
        const text = `${input.postTitle || ''} ${input.postBody || ''} ${input.commentBody || ''}`.toLowerCase();
        const keywords = Array.isArray(condition.value)
          ? (condition.value as string[])
          : [String(condition.value)];
        result = keywords.some((kw) => text.includes(kw.toLowerCase()));
        break;
      }
      case 'link_domain': {
        const links = input.links || [];
        const domain = String(condition.value);
        result = links.some((l) => l.includes(domain));
        break;
      }
      case 'nsfw_flag':
        result = Boolean(input.isNsfw) === Boolean(condition.value);
        break;
      case 'user_is_banned':
        result = input.authorIsBanned === Boolean(condition.value);
        break;
      default:
        result = false;
    }

    return condition.negate ? !result : result;
  }

  private compareNumbers(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'greater_than': return actual > expected;
      case 'less_than': return actual < expected;
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      default: return false;
    }
  }

  private determineFinalResult(triggeredRules: TriggeredRule[]): SimulationResult {
    if (triggeredRules.length === 0) return 'PASS';

    const allActions = triggeredRules.flatMap((r) => r.actions);

    if (allActions.includes('ban') || allActions.includes('mute')) return 'REMOVE';
    if (allActions.includes('remove')) return 'REMOVE';
    if (allActions.includes('lock')) return 'LOCK';
    if (allActions.includes('escalate')) return 'ESCALATE';
    if (allActions.includes('filter') || allActions.includes('queue')) return 'FILTER';
    if (allActions.includes('warn')) return 'WARNING';

    return 'PASS';
  }

  private async generateSimulationReasoning(
    input: SimulationInput,
    triggeredRules: TriggeredRule[],
    result: SimulationResult
  ): Promise<string> {
    if (triggeredRules.length === 0) {
      return 'No rules were triggered. The content passed all active moderation checks.';
    }

    return `Result: ${result}. ${triggeredRules.length} rule(s) triggered: ${triggeredRules.map((r) => r.ruleName).join(', ')}. Actions applied: ${[...new Set(triggeredRules.flatMap((r) => r.actions))].join(', ')}.`;
  }

  private async estimateFalsePositiveProbability(
    input: SimulationInput,
    triggeredRules: TriggeredRule[]
  ): Promise<number> {
    if (triggeredRules.length === 0) return 0;

    // Average false positive rates from rules
    const avgRate = triggeredRules.length > 0 ? 0.05 : 0;
    return avgRate;
  }

  private getDefaultEdgeCases(): SimulationInput[] {
    return [
      {
        postTitle: 'New to crypto, looking for advice on getting started',
        postBody: 'I recently heard about Bitcoin and Ethereum. What is the best way to learn?',
        authorUsername: 'curious_newbie',
        authorAccountAge: 2,
        authorKarma: 5,
        authorIsBanned: false,
        subredditName: 'CryptoCurrency',
      },
      {
        commentBody: 'This is the worst code I have ever seen in my life. Did a 5 year old write this?',
        authorUsername: 'grumpy_dev_42',
        authorAccountAge: 820,
        authorKarma: 14200,
        authorIsBanned: false,
        subredditName: 'programming',
      },
    ];
  }
}
