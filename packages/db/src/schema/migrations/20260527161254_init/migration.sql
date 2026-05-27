-- CreateTable
CREATE TABLE "subreddits" (
    "id" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "activeUserCount" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'public',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "integratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "autoModerationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiAssistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "raidDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shadowScopeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "toxicityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "slowModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slowModeSeconds" INTEGER NOT NULL DEFAULT 300,

    CONSTRAINT "subreddits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderator_users" (
    "id" TEXT NOT NULL,
    "redditUsername" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderator_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subreddit_moderators" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'mod',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subreddit_moderators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_rules" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "naturalLanguageInput" TEXT NOT NULL,
    "parsedConditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "triggers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "aiExplanation" TEXT NOT NULL DEFAULT '',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "conflicts" JSONB NOT NULL DEFAULT '[]',
    "optimizationSuggestions" JSONB NOT NULL DEFAULT '[]',
    "estimatedFalsePositiveRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "estimatedCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "actionsApplied" INTEGER NOT NULL DEFAULT 0,
    "falsePositives" INTEGER NOT NULL DEFAULT 0,
    "appealsCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "history" JSONB NOT NULL DEFAULT '[]',
    "executions" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgExecTime" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastExecAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mod_queue_items" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentPreview" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "aiRecommendation" TEXT NOT NULL,
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiReasoning" TEXT NOT NULL DEFAULT '',
    "toxicityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mod_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_events" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'suspected',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "indicators" JSONB NOT NULL,
    "affectedPosts" JSONB NOT NULL DEFAULT '[]',
    "suspectedOrigin" TEXT,
    "usersInvolved" INTEGER NOT NULL DEFAULT 0,
    "actionsApplied" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raid_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspicious_accounts" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "indicators" JSONB NOT NULL,
    "linkedAccounts" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "actionTaken" TEXT,
    "reasoning" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suspicious_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "toxicityTrends" JSONB NOT NULL DEFAULT '[]',
    "moderationActivity" JSONB NOT NULL DEFAULT '[]',
    "topRules" JSONB NOT NULL DEFAULT '[]',
    "userTrustDistribution" JSONB NOT NULL,
    "insights" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_events" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "triggeredRuleIds" JSONB NOT NULL DEFAULT '[]',
    "appliedActions" JSONB NOT NULL DEFAULT '[]',
    "isAutomated" BOOLEAN NOT NULL DEFAULT true,
    "moderatorId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mod_tasks" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'review',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" JSONB NOT NULL DEFAULT '[]',
    "linkedItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mod_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_ratings" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subredditId" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copilot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subreddits_redditId_key" ON "subreddits"("redditId");

-- CreateIndex
CREATE UNIQUE INDEX "subreddits_name_key" ON "subreddits"("name");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_users_redditUsername_key" ON "moderator_users"("redditUsername");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_users_redditId_key" ON "moderator_users"("redditId");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_users_email_key" ON "moderator_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subreddit_moderators_subredditId_userId_key" ON "subreddit_moderators"("subredditId", "userId");

-- CreateIndex
CREATE INDEX "moderation_rules_subredditId_status_idx" ON "moderation_rules"("subredditId", "status");

-- CreateIndex
CREATE INDEX "workflows_subredditId_status_idx" ON "workflows"("subredditId", "status");

-- CreateIndex
CREATE INDEX "mod_queue_items_subredditId_status_idx" ON "mod_queue_items"("subredditId", "status");

-- CreateIndex
CREATE INDEX "mod_queue_items_subredditId_priority_idx" ON "mod_queue_items"("subredditId", "priority");

-- CreateIndex
CREATE INDEX "raid_events_subredditId_status_idx" ON "raid_events"("subredditId", "status");

-- CreateIndex
CREATE INDEX "suspicious_accounts_subredditId_status_idx" ON "suspicious_accounts"("subredditId", "status");

-- CreateIndex
CREATE INDEX "analytics_reports_subredditId_periodStart_idx" ON "analytics_reports"("subredditId", "periodStart");

-- CreateIndex
CREATE INDEX "moderation_events_subredditId_timestamp_idx" ON "moderation_events"("subredditId", "timestamp");

-- CreateIndex
CREATE INDEX "moderation_events_subredditId_type_idx" ON "moderation_events"("subredditId", "type");

-- CreateIndex
CREATE INDEX "mod_tasks_subredditId_status_idx" ON "mod_tasks"("subredditId", "status");

-- CreateIndex
CREATE INDEX "marketplace_templates_category_rating_idx" ON "marketplace_templates"("category", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_ratings_templateId_userId_key" ON "marketplace_ratings"("templateId", "userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "copilot_sessions_userId_idx" ON "copilot_sessions"("userId");

-- AddForeignKey
ALTER TABLE "subreddit_moderators" ADD CONSTRAINT "subreddit_moderators_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subreddit_moderators" ADD CONSTRAINT "subreddit_moderators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "moderator_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_rules" ADD CONSTRAINT "moderation_rules_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_rules" ADD CONSTRAINT "moderation_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "moderator_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "moderator_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_queue_items" ADD CONSTRAINT "mod_queue_items_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_events" ADD CONSTRAINT "raid_events_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_accounts" ADD CONSTRAINT "suspicious_accounts_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_tasks" ADD CONSTRAINT "mod_tasks_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_tasks" ADD CONSTRAINT "mod_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "moderator_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_tasks" ADD CONSTRAINT "mod_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "moderator_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_ratings" ADD CONSTRAINT "marketplace_ratings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "moderator_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
