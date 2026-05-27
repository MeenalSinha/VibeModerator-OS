// ============================================================
// VibeModerator OS — Database Seed (Demo Data)
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding VibeModerator OS demo data...');

  // Create demo subreddits
  const subreddit1 = await prisma.subreddit.upsert({
    where: { redditId: 'r_programming_demo' },
    update: {},
    create: {
      redditId: 'r_programming_demo',
      name: 'programming',
      displayName: 'r/programming',
      subscriberCount: 6200000,
      activeUserCount: 12400,
      type: 'public',
      healthScore: 0.72,
      autoModerationEnabled: true,
      aiAssistEnabled: true,
      raidDetectionEnabled: true,
      shadowScopeEnabled: true,
      toxicityThreshold: 0.65,
    },
  });

  const subreddit2 = await prisma.subreddit.upsert({
    where: { redditId: 'r_cryptocurrency_demo' },
    update: {},
    create: {
      redditId: 'r_cryptocurrency_demo',
      name: 'CryptoCurrency',
      displayName: 'r/CryptoCurrency',
      subscriberCount: 7800000,
      activeUserCount: 34200,
      type: 'public',
      healthScore: 0.48,
      autoModerationEnabled: true,
      aiAssistEnabled: true,
      raidDetectionEnabled: true,
      shadowScopeEnabled: true,
      toxicityThreshold: 0.7,
    },
  });

  const subreddit3 = await prisma.subreddit.upsert({
    where: { redditId: 'r_gaming_demo' },
    update: {},
    create: {
      redditId: 'r_gaming_demo',
      name: 'gaming',
      displayName: 'r/gaming',
      subscriberCount: 38000000,
      activeUserCount: 89000,
      type: 'public',
      healthScore: 0.61,
      autoModerationEnabled: true,
      aiAssistEnabled: true,
      raidDetectionEnabled: true,
      shadowScopeEnabled: true,
      toxicityThreshold: 0.75,
    },
  });

  // Create demo moderator users
  const mod1 = await prisma.moderatorUser.upsert({
    where: { redditUsername: 'demo_mod_alex' },
    update: {},
    create: {
      redditUsername: 'demo_mod_alex',
      redditId: 'u_demo_mod_alex',
      preferences: {
        theme: 'dark',
        notifications: {
          raidAlerts: true,
          toxicityAlerts: true,
          queueAlerts: true,
          weeklyReports: true,
          emailNotifications: false,
        },
        dashboardLayout: ['analytics', 'modmind', 'queue'],
      },
    },
  });

  const mod2 = await prisma.moderatorUser.upsert({
    where: { redditUsername: 'demo_mod_sarah' },
    update: {},
    create: {
      redditUsername: 'demo_mod_sarah',
      redditId: 'u_demo_mod_sarah',
      preferences: {
        theme: 'dark',
        notifications: {
          raidAlerts: true,
          toxicityAlerts: true,
          queueAlerts: false,
          weeklyReports: true,
          emailNotifications: true,
        },
        dashboardLayout: ['queue', 'analytics', 'hub'],
      },
    },
  });

  // Link moderators to subreddits
  await prisma.subredditModerator.upsert({
    where: { subredditId_userId: { subredditId: subreddit1.id, userId: mod1.id } },
    update: {},
    create: {
      subredditId: subreddit1.id,
      userId: mod1.id,
      role: 'admin',
      permissions: ['all'],
    },
  });

  await prisma.subredditModerator.upsert({
    where: { subredditId_userId: { subredditId: subreddit2.id, userId: mod1.id } },
    update: {},
    create: {
      subredditId: subreddit2.id,
      userId: mod1.id,
      role: 'mod',
      permissions: ['posts', 'comments', 'queue'],
    },
  });

  await prisma.subredditModerator.upsert({
    where: { subredditId_userId: { subredditId: subreddit1.id, userId: mod2.id } },
    update: {},
    create: {
      subredditId: subreddit1.id,
      userId: mod2.id,
      role: 'mod',
      permissions: ['posts', 'comments'],
    },
  });

  // Create demo moderation rules
  await prisma.moderationRule.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'rule_crypto_spam',
        subredditId: subreddit2.id,
        name: 'Crypto Spam Filter',
        description: 'Filters posts from new accounts promoting crypto links',
        naturalLanguageInput:
          'If a user account is younger than 3 days and posts crypto links, filter the post and comment with our spam warning.',
        parsedConditions: [
          { type: 'account_age', operator: 'less_than', value: 3, negate: false },
          {
            type: 'keyword_match',
            operator: 'contains',
            value: ['crypto', 'bitcoin', 'invest', 'moon', 'token', 'defi'],
            negate: false,
            logicGate: 'AND',
          },
        ],
        actions: ['filter', 'auto_comment'],
        triggers: ['post_submit', 'comment_submit'],
        status: 'active',
        confidence: 0.92,
        priority: 1,
        aiExplanation:
          'This rule targets a common spam pattern where newly created accounts are used to promote cryptocurrency content. New accounts under 3 days old have no established history and are frequently used for coordinated spam campaigns.',
        warnings: [],
        conflicts: [],
        optimizationSuggestions: ['Consider also checking karma below 10 for tighter targeting'],
        estimatedFalsePositiveRate: 0.04,
        estimatedCoverage: 0.87,
        totalMatches: 2341,
        actionsApplied: 2319,
        falsePositives: 94,
        appealsCount: 12,
        lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 3),
        createdById: mod1.id,
      },
      {
        id: 'rule_toxicity_high',
        subredditId: subreddit1.id,
        name: 'High Toxicity Auto-Remove',
        description: 'Automatically removes comments with critical toxicity scores',
        naturalLanguageInput:
          'Remove any comment that scores above 0.85 toxicity and send it to the mod queue for review.',
        parsedConditions: [
          { type: 'toxicity_score', operator: 'greater_than', value: 0.85, negate: false },
        ],
        actions: ['remove', 'queue'],
        triggers: ['comment_submit'],
        status: 'active',
        confidence: 0.97,
        priority: 1,
        aiExplanation:
          'Comments scoring above 0.85 toxicity are statistically very likely to violate community standards. The dual action of removal and queue ensures moderator visibility.',
        warnings: [],
        conflicts: [],
        optimizationSuggestions: [],
        estimatedFalsePositiveRate: 0.02,
        estimatedCoverage: 0.94,
        totalMatches: 876,
        actionsApplied: 858,
        falsePositives: 17,
        appealsCount: 5,
        lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 12),
        createdById: mod1.id,
      },
      {
        id: 'rule_low_karma_spam',
        subredditId: subreddit1.id,
        name: 'Low Karma Spam Gate',
        description: 'Gates posts from very low karma accounts to mod queue',
        naturalLanguageInput:
          'Send posts from accounts with less than 10 total karma to the moderation queue.',
        parsedConditions: [
          { type: 'karma_total', operator: 'less_than', value: 10, negate: false },
        ],
        actions: ['queue'],
        triggers: ['post_submit'],
        status: 'active',
        confidence: 0.78,
        priority: 2,
        aiExplanation:
          'Very low karma accounts are disproportionately associated with spam and throwaway accounts. Routing to mod queue rather than auto-removing reduces false positives.',
        warnings: ['May affect legitimate new users'],
        conflicts: [],
        optimizationSuggestions: ['Combine with account age check to reduce false positives'],
        estimatedFalsePositiveRate: 0.11,
        estimatedCoverage: 0.72,
        totalMatches: 4200,
        actionsApplied: 4200,
        falsePositives: 462,
        appealsCount: 38,
        lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 5),
        createdById: mod2.id,
      },
    ],
  });

  // Create demo mod queue items
  const queueItems = [
    {
      id: 'q_001',
      subredditId: subreddit2.id,
      type: 'post',
      contentId: 'post_abc123',
      contentPreview: 'MASSIVE GAINS! This new DeFi token will 100x in 24 hours! Early investors are already seeing returns...',
      authorUsername: 'crypto_shill_9281',
      priority: 'high',
      aiRecommendation: 'remove',
      aiConfidence: 0.94,
      aiReasoning: 'Post matches crypto spam pattern: new account (2 days), promotional language, unsubstantiated gain claims, DeFi token mention.',
      toxicityScore: 0.31,
      status: 'pending',
    },
    {
      id: 'q_002',
      subredditId: subreddit1.id,
      type: 'comment',
      contentId: 'comment_def456',
      contentPreview: "You're literally the dumbest person alive if you think this is correct. Anyone who agrees with you is also braindead.",
      authorUsername: 'angry_coder_42',
      priority: 'critical',
      aiRecommendation: 'remove',
      aiConfidence: 0.97,
      aiReasoning: 'Direct personal attacks and derogatory language. Toxicity score 0.93. Clear violation of subreddit conduct rules.',
      toxicityScore: 0.93,
      status: 'pending',
    },
    {
      id: 'q_003',
      subredditId: subreddit3.id,
      type: 'post',
      contentId: 'post_ghi789',
      contentPreview: 'Is this game worth buying? I saw it on sale. [self.gaming]',
      authorUsername: 'newgamer_2024',
      priority: 'low',
      aiRecommendation: 'approve',
      aiConfidence: 0.89,
      aiReasoning: 'Legitimate question from new account. No spam signals. Common question type for gaming community.',
      toxicityScore: 0.02,
      status: 'pending',
    },
    {
      id: 'q_004',
      subredditId: subreddit2.id,
      type: 'comment',
      contentId: 'comment_jkl012',
      contentPreview: 'Buy $MOON before it launches tomorrow! Join our telegram for insider tips: t.me/moongang',
      authorUsername: 'moon_pumper_x',
      priority: 'critical',
      aiRecommendation: 'remove',
      aiConfidence: 0.99,
      aiReasoning: 'Pump-and-dump pattern detected. External chat invite (Telegram), ticker promotion, urgency language. Likely coordinated manipulation.',
      toxicityScore: 0.44,
      status: 'pending',
    },
    {
      id: 'q_005',
      subredditId: subreddit1.id,
      type: 'report',
      contentId: 'post_mno345',
      contentPreview: "Here's a tutorial on building a REST API with Node.js and TypeScript...",
      authorUsername: 'dev_tutorials',
      priority: 'low',
      aiRecommendation: 'approve',
      aiConfidence: 0.91,
      aiReasoning: 'Reported for spam but content is legitimate technical tutorial. Reporter may have misidentified promotional intent.',
      toxicityScore: 0.01,
      status: 'in_progress',
      assignedTo: 'demo_mod_alex',
    },
  ];

  for (const item of queueItems) {
    await prisma.modQueueItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // Create demo raid event
  await prisma.raidEvent.upsert({
    where: { id: 'raid_001' },
    update: {},
    create: {
      id: 'raid_001',
      subredditId: subreddit2.id,
      status: 'active',
      severity: 'high',
      indicators: [
        { type: 'traffic_spike', description: '340% above normal traffic', confidence: 0.91 },
        { type: 'new_account_surge', description: '47 accounts under 24h old in 10 minutes', confidence: 0.87 },
        { type: 'coordinated_comments', description: 'Identical message pattern across 23 comments', confidence: 0.94 },
        { type: 'external_origin', description: 'Traffic spike correlates with r/altcoin link', confidence: 0.78 },
      ],
      affectedPosts: ['post_raid_1', 'post_raid_2', 'post_raid_3'],
      suspectedOrigin: 'r/altcoins',
      usersInvolved: 47,
      actionsApplied: ['slow_mode', 'queue'],
    },
  });

  // Create demo suspicious accounts
  await prisma.suspiciousAccount.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'sus_001',
        subredditId: subreddit2.id,
        username: 'crypto_investor_88',
        riskScore: 0.87,
        indicators: [
          { type: 'writing_similarity', description: '94% text similarity to banned user moonshark22', confidence: 0.94 },
          { type: 'posting_pattern', description: 'Posts at identical times to banned account', confidence: 0.82 },
          { type: 'account_age', description: 'Created 1 day after ban of related account', confidence: 0.91 },
        ],
        linkedAccounts: [
          { username: 'moonshark22', confidence: 0.94, sharedIndicators: ['writing_style', 'posting_times'], relationship: 'probable_alt' },
        ],
        status: 'investigating',
        reasoning: 'High confidence ban evasion. Writing fingerprint matches banned user with 94% similarity. Account created 26 hours after the ban.',
      },
    ],
  });

  // Create demo analytics report
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.analyticsReport.create({
    data: {
      subredditId: subreddit1.id,
      periodStart: weekAgo,
      periodEnd: now,
      metrics: {
        totalPostsReviewed: 18420,
        totalRemovals: 1203,
        totalWarnings: 456,
        totalBans: 23,
        toxicityPrevented: 892,
        spamBlocked: 3104,
        moderatorTimeSavedHours: 47.2,
        falsePositiveRate: 0.038,
        communityHealthScore: 0.72,
        engagementQualityScore: 0.68,
        moderatorWorkloadScore: 0.45,
        userRetentionImpact: 0.12,
      },
      toxicityTrends: Array.from({ length: 7 }, (_, i) => ({
        timestamp: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
        score: 0.3 + Math.random() * 0.3,
        level: 'medium',
        postCount: Math.floor(2000 + Math.random() * 1000),
        commentCount: Math.floor(8000 + Math.random() * 4000),
      })),
      moderationActivity: Array.from({ length: 7 }, (_, i) => ({
        timestamp: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
        actions: Math.floor(200 + Math.random() * 100),
        autoActions: Math.floor(150 + Math.random() * 80),
        manualActions: Math.floor(50 + Math.random() * 30),
      })),
      topRules: [
        { ruleId: 'rule_toxicity_high', ruleName: 'High Toxicity Auto-Remove', triggers: 876, effectiveness: 0.96 },
        { ruleId: 'rule_low_karma_spam', ruleName: 'Low Karma Spam Gate', triggers: 4200, effectiveness: 0.89 },
      ],
      userTrustDistribution: { high: 0.62, medium: 0.24, low: 0.09, suspicious: 0.05 },
      insights: [
        {
          id: 'insight_001',
          type: 'warning',
          title: 'Toxicity Spike Detected',
          description: 'Toxicity levels increased 23% in the past 48 hours, correlating with a trending controversial post.',
          severity: 'medium',
          actionable: true,
          suggestedAction: 'Consider temporarily enabling slow mode and reviewing top-level comments on the trending thread.',
          timestamp: new Date(),
        },
        {
          id: 'insight_002',
          type: 'achievement',
          title: 'Spam Reduction Record',
          description: 'AI moderation blocked 3,104 spam posts this week, a 41% improvement over last week.',
          severity: 'info',
          actionable: false,
          timestamp: new Date(),
        },
        {
          id: 'insight_003',
          type: 'recommendation',
          title: 'Rule Optimization Available',
          description: "The 'Low Karma Spam Gate' rule has an 11% false positive rate. Adding an account age condition could reduce this to under 5%.",
          severity: 'low',
          actionable: true,
          suggestedAction: 'Edit the rule to also require account age under 7 days alongside the karma check.',
          timestamp: new Date(),
        },
      ],
    },
  });

  // Create demo marketplace templates
  await prisma.marketplaceTemplate.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'mkt_crypto_pack',
        name: 'Crypto Community Protection Pack',
        description: 'Complete moderation pack for crypto subreddits. Includes pump-and-dump detection, shill filtering, and FUD prevention.',
        authorId: mod1.id,
        authorName: 'demo_mod_alex',
        category: 'crypto',
        type: 'pack',
        content: { rules: 5, workflows: 2, description: 'Comprehensive crypto moderation' },
        rating: 4.8,
        ratingCount: 234,
        installCount: 1820,
        forkCount: 47,
        tags: ['crypto', 'spam', 'pump-and-dump', 'shill'],
        isVerified: true,
      },
      {
        id: 'mkt_gaming_starter',
        name: 'Gaming Community Starter Kit',
        description: 'Essential rules for gaming subreddits: off-topic filtering, spoiler enforcement, and toxicity management.',
        authorId: mod2.id,
        authorName: 'demo_mod_sarah',
        category: 'gaming',
        type: 'pack',
        content: { rules: 8, workflows: 3, description: 'Gaming community essentials' },
        rating: 4.6,
        ratingCount: 891,
        installCount: 6420,
        forkCount: 203,
        tags: ['gaming', 'spoilers', 'toxicity', 'off-topic'],
        isVerified: true,
      },
      {
        id: 'mkt_anti_brigade',
        name: 'Anti-Brigading Defense System',
        description: 'Advanced workflow for detecting and containing brigading attempts. Includes traffic analysis and coordinated behavior detection.',
        authorId: mod1.id,
        authorName: 'demo_mod_alex',
        category: 'general',
        type: 'workflow',
        content: { nodes: 12, description: 'Brigade detection workflow' },
        rating: 4.9,
        ratingCount: 156,
        installCount: 942,
        forkCount: 31,
        tags: ['brigade', 'raid', 'protection', 'security'],
        isVerified: true,
      },
    ],
  });

  // Create demo mod tasks
  await prisma.modTask.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'task_001',
        subredditId: subreddit2.id,
        title: 'Investigate coordinated pump campaign',
        description: 'Multiple accounts promoting the same token across 3 threads. Suspected coordinated manipulation.',
        type: 'investigation',
        status: 'in_progress',
        priority: 'critical',
        assignedToId: mod1.id,
        createdById: mod1.id,
        notes: [{ id: 'n1', authorId: mod1.id, content: 'Found 12 accounts with similar patterns', createdAt: new Date(), isInternal: true }],
        linkedItems: [{ type: 'user', id: 'crypto_shill_9281', label: 'crypto_shill_9281' }],
      },
      {
        id: 'task_002',
        subredditId: subreddit1.id,
        title: 'Review new rule performance',
        description: 'The high toxicity rule was deployed 3 days ago. Review false positive rate and adjust threshold if needed.',
        type: 'review',
        status: 'todo',
        priority: 'medium',
        assignedToId: mod2.id,
        createdById: mod1.id,
        notes: [],
        linkedItems: [{ type: 'rule', id: 'rule_toxicity_high', label: 'High Toxicity Auto-Remove' }],
      },
      {
        id: 'task_003',
        subredditId: subreddit3.id,
        title: 'Weekend moderation shift handoff',
        description: 'Active incident: gaming spoiler leak thread. 3 posts removed, thread locked. Monitor for re-posts.',
        type: 'incident',
        status: 'done',
        priority: 'high',
        assignedToId: mod2.id,
        createdById: mod2.id,
        notes: [{ id: 'n2', authorId: mod2.id, content: 'Thread resolved. Added spoiler rule to prevent future incidents.', createdAt: new Date(), isInternal: false }],
        linkedItems: [],
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ],
  });

  console.log('Seed complete. VibeModerator OS demo data ready.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
