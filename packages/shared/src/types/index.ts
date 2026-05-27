// ============================================================
// VibeModerator OS — Shared Types
// ============================================================

export type ModerationAction =
  | 'remove'
  | 'filter'
  | 'warn'
  | 'mute'
  | 'lock'
  | 'report'
  | 'queue'
  | 'restrict'
  | 'auto_comment'
  | 'auto_flair'
  | 'escalate'
  | 'approve'
  | 'ban';

export type TriggerType =
  | 'post_submit'
  | 'comment_submit'
  | 'report'
  | 'mod_action'
  | 'scheduled'
  | 'vote_threshold'
  | 'user_join';

export type RuleStatus = 'draft' | 'active' | 'paused' | 'archived' | 'testing';

export type SimulationResult =
  | 'PASS'
  | 'FILTER'
  | 'REMOVE'
  | 'WARNING'
  | 'ESCALATE'
  | 'LOCK'
  | 'BAN';

export type ToxicityLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type RaidStatus = 'none' | 'suspected' | 'active' | 'contained';

export interface ModerationRule {
  id: string;
  subredditId: string;
  name: string;
  description: string;
  naturalLanguageInput: string;
  parsedConditions: RuleCondition[];
  actions: ModerationAction[];
  triggers: TriggerType[];
  status: RuleStatus;
  confidence: number;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: RuleMetadata;
  stats: RuleStats;
}

export interface RuleCondition {
  id: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  negate: boolean;
  children?: RuleCondition[];
  logicGate?: 'AND' | 'OR';
}

export type ConditionType =
  | 'account_age'
  | 'karma_total'
  | 'karma_post'
  | 'karma_comment'
  | 'keyword_match'
  | 'regex_match'
  | 'link_domain'
  | 'flair_text'
  | 'flair_template'
  | 'post_type'
  | 'nsfw_flag'
  | 'toxicity_score'
  | 'sentiment_score'
  | 'raid_probability'
  | 'spam_confidence'
  | 'user_history'
  | 'post_velocity'
  | 'report_count'
  | 'time_of_day'
  | 'day_of_week'
  | 'user_is_banned'
  | 'user_is_contributor'
  | 'title_length'
  | 'body_length'
  | 'rate_limit';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'in_list'
  | 'not_in_list';

export interface RuleMetadata {
  aiExplanation: string;
  triggers: string[];
  warnings: string[];
  conflicts: string[];
  optimizationSuggestions: string[];
  estimatedFalsePositiveRate: number;
  estimatedCoverage: number;
}

export interface RuleStats {
  totalMatches: number;
  actionsApplied: number;
  falsePositives: number;
  appealsCount: number;
  lastTriggeredAt: Date | null;
  averageConfidence: number;
}

// Workflow types
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  connections: string[];
}

export type WorkflowNodeType =
  | 'trigger'
  | 'condition'
  | 'action'
  | 'ai_check'
  | 'subflow'
  | 'delay'
  | 'branch'
  | 'loop'
  | 'notification';

export interface WorkflowNodeData {
  label: string;
  config: Record<string, unknown>;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Workflow {
  id: string;
  subredditId: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'active' | 'paused' | 'draft';
  version: number;
  history: WorkflowVersion[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  stats: WorkflowStats;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  condition?: string;
}

export interface WorkflowVersion {
  version: number;
  snapshot: string;
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
}

export interface WorkflowStats {
  executions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecutedAt: Date | null;
}

// Simulation types
export interface SimulationInput {
  postTitle?: string;
  postBody?: string;
  commentBody?: string;
  authorUsername: string;
  authorAccountAge: number;
  authorKarma: number;
  authorIsBanned: boolean;
  subredditName: string;
  flair?: string;
  isNsfw?: boolean;
  links?: string[];
}

export interface SimulationOutput {
  id: string;
  input: SimulationInput;
  result: SimulationResult;
  confidence: number;
  triggeredRules: TriggeredRule[];
  executionTrace: ExecutionStep[];
  falsePositiveProbability: number;
  reasoning: string;
  executionTimeMs: number;
  timestamp: Date;
}

export interface TriggeredRule {
  ruleId: string;
  ruleName: string;
  matchedConditions: string[];
  actions: ModerationAction[];
  confidence: number;
}

export interface ExecutionStep {
  stepId: string;
  nodeType: string;
  nodeName: string;
  input: unknown;
  output: unknown;
  passed: boolean;
  durationMs: number;
  reasoning?: string;
}

// Analytics types
export interface SubredditAnalytics {
  subredditId: string;
  subredditName: string;
  period: AnalyticsPeriod;
  metrics: AnalyticsMetrics;
  toxicityTrends: ToxicityDataPoint[];
  moderationActivity: ModerationActivityPoint[];
  topRules: TopRuleMetric[];
  userTrustDistribution: TrustDistribution;
  insights: AIInsight[];
  generatedAt: Date;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface AnalyticsMetrics {
  totalPostsReviewed: number;
  totalRemovals: number;
  totalWarnings: number;
  totalBans: number;
  toxicityPrevented: number;
  spamBlocked: number;
  moderatorTimeSavedHours: number;
  falsePositiveRate: number;
  communityHealthScore: number;
  engagementQualityScore: number;
  moderatorWorkloadScore: number;
  userRetentionImpact: number;
}

export interface ToxicityDataPoint {
  timestamp: Date;
  score: number;
  level: ToxicityLevel;
  postCount: number;
  commentCount: number;
}

export interface ModerationActivityPoint {
  timestamp: Date;
  actions: number;
  autoActions: number;
  manualActions: number;
}

export interface TopRuleMetric {
  ruleId: string;
  ruleName: string;
  triggers: number;
  effectiveness: number;
}

export interface TrustDistribution {
  high: number;
  medium: number;
  low: number;
  suspicious: number;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'recommendation' | 'achievement' | 'trend';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
  timestamp: Date;
}

// Brigade/Raid detection
export interface RaidEvent {
  id: string;
  subredditId: string;
  detectedAt: Date;
  status: RaidStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: RaidIndicator[];
  affectedPosts: string[];
  suspectedOrigin?: string;
  usersInvolved: number;
  actionsApplied: ModerationAction[];
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface RaidIndicator {
  type: string;
  description: string;
  confidence: number;
  dataPoints: unknown[];
}

// Ban evasion / ShadowScope
export interface SuspiciousAccount {
  id: string;
  subredditId: string;
  username: string;
  detectedAt: Date;
  riskScore: number;
  indicators: EvasionIndicator[];
  linkedAccounts: LinkedAccount[];
  status: 'investigating' | 'confirmed' | 'cleared' | 'actioned';
  actionTaken?: ModerationAction;
  reasoning: string;
}

export interface EvasionIndicator {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface LinkedAccount {
  username: string;
  confidence: number;
  sharedIndicators: string[];
  relationship: 'probable_alt' | 'possible_alt' | 'coordinated';
}

// Mod Queue
export interface ModQueueItem {
  id: string;
  subredditId: string;
  type: 'post' | 'comment' | 'report';
  contentId: string;
  contentPreview: string;
  authorUsername: string;
  reportedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  aiRecommendation: ModerationAction;
  aiConfidence: number;
  aiReasoning: string;
  toxicityScore: number;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedAction?: ModerationAction;
}

// Marketplace
export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  category: MarketplaceCategory;
  type: 'rule' | 'workflow' | 'pack';
  content: ModerationRule | Workflow | ModerationPack;
  rating: number;
  ratingCount: number;
  installCount: number;
  forkCount: number;
  tags: string[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketplaceCategory =
  | 'gaming'
  | 'politics'
  | 'finance'
  | 'memes'
  | 'support'
  | 'education'
  | 'nsfw'
  | 'crypto'
  | 'marketplace'
  | 'general'
  | 'news';

export interface ModerationPack {
  id: string;
  name: string;
  description: string;
  rules: ModerationRule[];
  workflows: Workflow[];
}

// User / Auth
export interface ModeratorUser {
  id: string;
  redditUsername: string;
  subreddits: SubredditMembership[];
  preferences: UserPreferences;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface SubredditMembership {
  subredditId: string;
  subredditName: string;
  role: 'mod' | 'admin' | 'viewer';
  permissions: string[];
  joinedAt: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  notifications: NotificationPreferences;
  dashboardLayout: string[];
}

export interface NotificationPreferences {
  raidAlerts: boolean;
  toxicityAlerts: boolean;
  queueAlerts: boolean;
  weeklyReports: boolean;
  emailNotifications: boolean;
}

// Subreddit
export interface Subreddit {
  id: string;
  name: string;
  displayName: string;
  subscriberCount: number;
  activeUserCount: number;
  type: 'public' | 'restricted' | 'private' | 'nsfw';
  createdAt: Date;
  integratedAt: Date;
  settings: SubredditSettings;
  healthScore: number;
}

export interface SubredditSettings {
  autoModerationEnabled: boolean;
  aiAssistEnabled: boolean;
  raidDetectionEnabled: boolean;
  shadowScopeEnabled: boolean;
  toxicityThreshold: number;
  slowModeEnabled: boolean;
  slowModeSeconds: number;
  postingRestrictions: string;
  modQueueEnabled: boolean;
}

// Copilot / Chat
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: CopilotContext;
  actions?: CopilotSuggestedAction[];
  sources?: string[];
}

export interface CopilotContext {
  subredditId?: string;
  relatedPostIds?: string[];
  relatedRuleIds?: string[];
  moderationEventIds?: string[];
}

export interface CopilotSuggestedAction {
  type: string;
  label: string;
  description: string;
  payload: unknown;
}

// Moderation Hub / Ops
export interface ModTask {
  id: string;
  subredditId: string;
  title: string;
  description: string;
  type: 'review' | 'action' | 'investigation' | 'report' | 'incident';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  dueAt?: Date;
  completedAt?: Date;
  notes: TaskNote[];
  linkedItems: LinkedItem[];
}

export interface TaskNote {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface LinkedItem {
  type: 'post' | 'comment' | 'user' | 'rule' | 'incident';
  id: string;
  label: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  requestId: string;
  timestamp: Date;
}

// Events
export interface ModerationEvent {
  id: string;
  subredditId: string;
  type: ModerationEventType;
  contentId: string;
  contentType: 'post' | 'comment';
  authorUsername: string;
  triggeredRuleIds: string[];
  appliedActions: ModerationAction[];
  isAutomated: boolean;
  moderatorId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export type ModerationEventType =
  | 'rule_triggered'
  | 'auto_removed'
  | 'auto_filtered'
  | 'auto_warned'
  | 'manually_removed'
  | 'manually_approved'
  | 'ban_applied'
  | 'raid_detected'
  | 'raid_contained'
  | 'evasion_suspected'
  | 'toxicity_alert';
