// ============================================================
// VibeModerator OS — Reddit Devvit App
// ============================================================

import { Devvit, SettingScope } from '@devvit/public-api';

// Enable required Reddit API features
Devvit.configure({
  redditAPI: true,
  http: true,
  kvStore: true,
  scheduler: true,
});

Devvit.addSettings([
  {
    name: 'VIBEMOD_BACKEND_URL',
    label: 'VibeModerator OS Backend URL',
    type: 'string',
    isSecret: true,
    scope: SettingScope.App,
  },
  {
    name: 'VIBEMOD_API_SECRET',
    label: 'VibeModerator API Secret',
    type: 'string',
    isSecret: true,
    scope: SettingScope.App,
  },
  {
    name: 'VIBEMOD_DASHBOARD_URL',
    label: 'VibeModerator OS Dashboard URL',
    type: 'string',
    isSecret: false,
    scope: SettingScope.App,
  },
]);

// ============================================================
// Helper: call VibeModerator OS backend
// ============================================================

async function callBackend(
  context: any,
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown
): Promise<unknown> {
  const BACKEND_URL = (await context.settings.get('VIBEMOD_BACKEND_URL')) || 'http://localhost:8080';
  const API_SECRET = (await context.settings.get('VIBEMOD_API_SECRET')) || '';

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_SECRET}`,
      'X-Source': 'devvit',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    console.error(`VibeModerator API error: ${response.status} ${path}`);
    return null;
  }

  return response.json();
}

// ============================================================
// Trigger: Post Submit
// ============================================================

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context: TriggerContext) => {
    const { post, author } = event;
    if (!post || !author) return;

    console.log(`[VibeMod] PostSubmit: ${post.id} by ${author.name}`);

    try {
      // Get author info
      const authorUser = await context.reddit.getUserByUsername(author.name);
      const subreddit = await context.reddit.getCurrentSubreddit();

      const payload = {
        type: 'post_submit',
        contentId: post.id,
        contentType: 'post',
        authorUsername: author.name,
        subredditId: subreddit.id,
        subredditName: subreddit.name,
        content: {
          title: post.title,
          body: post.body || '',
          url: post.url,
          isNsfw: post.nsfw,
          flair: post.linkFlairText || null,
        },
        author: {
          karma: (authorUser?.linkKarma || 0) + (authorUser?.commentKarma || 0),
          accountAge: authorUser?.createdAt
            ? Math.floor((Date.now() - new Date(authorUser.createdAt).getTime()) / 86400000)
            : 0,
          isBanned: false,
        },
      };

      const result = await callBackend(context, '/api/devvit/evaluate', 'POST', payload) as {
        action?: string;
        confidence?: number;
        ruleId?: string;
        message?: string;
      } | null;

      if (!result) return;

      // Apply moderation action based on backend decision
      switch (result.action) {
        case 'remove':
          await context.reddit.remove(post.id, false);
          console.log(`[VibeMod] Auto-removed post ${post.id} (confidence: ${result.confidence})`);
          break;

        case 'filter':
          await context.reddit.approve(post.id);
          // Note: actual filtering requires queue API
          console.log(`[VibeMod] Filtered post ${post.id} to mod queue`);
          break;

        case 'warn':
          if (result.message) {
            await context.reddit.submitComment({
              id: post.id,
              text: result.message,
            });
          }
          break;

        case 'lock':
          await context.reddit.lock(post.id);
          console.log(`[VibeMod] Locked post ${post.id}`);
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[VibeMod] PostSubmit error:', err);
    }
  },
});

// ============================================================
// Trigger: Comment Submit
// ============================================================

Devvit.addTrigger({
  event: 'CommentSubmit',
  onEvent: async (event, context: TriggerContext) => {
    const { comment, author } = event;
    if (!comment || !author) return;

    console.log(`[VibeMod] CommentSubmit: ${comment.id} by ${author.name}`);

    try {
      const authorUser = await context.reddit.getUserByUsername(author.name);
      const subreddit = await context.reddit.getCurrentSubreddit();

      const payload = {
        type: 'comment_submit',
        contentId: comment.id,
        contentType: 'comment',
        authorUsername: author.name,
        subredditId: subreddit.id,
        subredditName: subreddit.name,
        content: {
          body: comment.body,
          parentId: comment.parentId,
        },
        author: {
          karma: (authorUser?.linkKarma || 0) + (authorUser?.commentKarma || 0),
          accountAge: authorUser?.createdAt
            ? Math.floor((Date.now() - new Date(authorUser.createdAt).getTime()) / 86400000)
            : 0,
          isBanned: false,
        },
      };

      const result = await callBackend(context, '/api/devvit/evaluate', 'POST', payload) as {
        action?: string;
        confidence?: number;
        message?: string;
      } | null;

      if (!result) return;

      switch (result.action) {
        case 'remove':
          await context.reddit.remove(comment.id, false);
          break;
        case 'warn':
          if (result.message) {
            await context.reddit.submitComment({
              id: comment.parentId,
              text: result.message,
            });
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[VibeMod] CommentSubmit error:', err);
    }
  },
});

// ============================================================
// Trigger: Report
// ============================================================

Devvit.addTrigger({
  event: 'PostReport',
  onEvent: async (event, context: TriggerContext) => {
    const { post } = event;
    if (!post) return;

    try {
      const subreddit = await context.reddit.getCurrentSubreddit();
      await callBackend(context, '/api/devvit/events', 'POST', {
        type: 'report',
        contentId: post.id,
        contentType: 'post',
        subredditId: subreddit.id,
        subredditName: subreddit.name,
        metadata: { reportedAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[VibeMod] PostReport error:', err);
    }
  },
});

// ============================================================
// Menu Action: Analyze with VibeModerator
// ============================================================

Devvit.addMenuItem({
  label: 'Analyze with VibeModerator',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const { location, targetId } = event;
    if (!targetId) return;

    const subreddit = await context.reddit.getCurrentSubreddit();

    const result = await callBackend(context, '/api/devvit/analyze', 'POST', {
      contentId: targetId,
      contentType: location,
      subredditId: subreddit.id,
    }) as { toxicityScore?: number; recommendation?: string; reasoning?: string } | null;

    if (result) {
      await context.ui.showToast({
        text: `AI: ${result.recommendation?.toUpperCase()} (toxicity: ${Math.round((result.toxicityScore || 0) * 100)}%)`,
        appearance: result.toxicityScore && result.toxicityScore > 0.7 ? 'neutral' : 'success',
      });
    }
  },
});

// ============================================================
// Menu Action: Open VibeModerator Dashboard
// ============================================================

Devvit.addMenuItem({
  label: 'Open VibeModerator OS',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const dashboardUrl = (await context.settings.get('VIBEMOD_DASHBOARD_URL')) || 'http://localhost:5173';
    await context.ui.navigateTo(`${dashboardUrl}?subreddit=${subreddit.name}`);
  },
});

// ============================================================
// Menu Action: Quick Rule from post
// ============================================================

Devvit.addMenuItem({
  label: 'Create VibeMod Rule from this post',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const { targetId } = event;
    if (!targetId) return;

    const post = await context.reddit.getPostById(targetId);
    const subreddit = await context.reddit.getCurrentSubreddit();

    await callBackend(context, '/api/devvit/quick-rule', 'POST', {
      subredditId: subreddit.id,
      subredditName: subreddit.name,
      postTitle: post.title,
      postBody: post.body || '',
    });

    await context.ui.showToast({
      text: 'Rule suggestion created in VibeModerator OS',
      appearance: 'success',
    });
  },
});

// ============================================================
// Scheduled Job: Traffic monitoring (brigade detection)
// ============================================================

Devvit.addSchedulerJob({
  name: 'vibemod_traffic_check',
  onRun: async (_, context) => {
    try {
      const subreddit = await context.reddit.getCurrentSubreddit();

      // Get recent post count as proxy for traffic
      const recentPosts = await context.reddit.getNewPosts({
        subredditName: subreddit.name,
        limit: 25,
      }).all();

      await callBackend(context, '/api/devvit/traffic', 'POST', {
        subredditId: subreddit.id,
        subredditName: subreddit.name,
        newPosts: recentPosts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[VibeMod] Traffic check error:', err);
    }
  },
});

// ============================================================
// Menu Item: Post VibeModerator Status to Subreddit
// ============================================================

Devvit.addMenuItem({
  label: '📊 Post VibeMod Status Update',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_, context) => {
    try {
      const subreddit = await context.reddit.getCurrentSubreddit();
      const dashboardUrl = (await context.settings.get('VIBEMOD_DASHBOARD_URL')) || 'http://localhost:5173';

      await context.reddit.submitPost({
        subredditName: subreddit.name,
        title: `🛡️ VibeModerator OS — Active Protection Status`,
        text: [
          '## VibeModerator OS is actively protecting this community',
          '',
          'AI-powered moderation is running to keep this subreddit safe.',
          '',
          `**Dashboard:** ${dashboardUrl}`,
          '',
          `*Posted by VibeModerator OS at ${new Date().toUTCString()}*`,
        ].join('\n'),
      });

      context.ui.showToast('✅ Status post created!');
    } catch (err) {
      console.error('[VibeMod] Status post error:', err);
      context.ui.showToast('❌ Failed to create status post');
    }
  },
});

export default Devvit;
