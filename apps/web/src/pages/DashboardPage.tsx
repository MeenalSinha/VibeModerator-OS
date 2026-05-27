// ============================================================
// VibeModerator OS — Dashboard Page
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Inbox, Siren, Eye, TrendingUp, TrendingDown,
  Clock, Zap, Activity, AlertTriangle, CheckCircle2, Users
} from 'lucide-react';
import { analyticsApi, brigadeApi, queueApi } from '../lib/api';
import { useSubredditStore } from '../store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.3 } }),
};

export function DashboardPage() {
  const { activeSubredditId, getActiveSubreddit } = useSubredditStore();
  const activeSubreddit = getActiveSubreddit();

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', activeSubredditId],
    queryFn: () => analyticsApi.get(activeSubredditId!, '7d'),
    enabled: !!activeSubredditId,
    refetchInterval: 30000,
  });

  const { data: realtimeData } = useQuery({
    queryKey: ['realtime', activeSubredditId],
    queryFn: () => analyticsApi.realtime(activeSubredditId!),
    enabled: !!activeSubredditId,
    refetchInterval: 15000,
  });

  const { data: brigadeData } = useQuery({
    queryKey: ['brigade-status', activeSubredditId],
    queryFn: () => brigadeApi.status(activeSubredditId!),
    enabled: !!activeSubredditId,
    refetchInterval: 10000,
  });

  const { data: queueData } = useQuery({
    queryKey: ['queue', activeSubredditId, 'pending'],
    queryFn: () => queueApi.list(activeSubredditId!, { status: 'pending', limit: 5 }),
    enabled: !!activeSubredditId,
    refetchInterval: 20000,
  });

  const metrics = analyticsData?.data?.data?.report?.metrics;
  const realtime = realtimeData?.data?.data;
  const raidStatus = brigadeData?.data?.data;
  const queue = queueData?.data?.data;

  // Generate mock sparkline data if no real data
  const toxicityTrend = analyticsData?.data?.data?.report?.toxicityTrends ||
    Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
      score: 0.2 + Math.random() * 0.4,
    }));

  const activityData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    auto: Math.floor(Math.random() * 60),
    manual: Math.floor(Math.random() * 20),
  }));

  return (
    <div className="space-y-6">
      {/* Raid Alert Banner */}
      {raidStatus?.isActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <Siren className="w-5 h-5 text-red-400 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Brigade Detected</p>
            <p className="text-xs text-red-400/70">
              Active raid event with {raidStatus.event?.severity} severity.
              BrigadeSentry is monitoring.
            </p>
          </div>
          <button className="btn-secondary text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
            View Details
          </button>
        </motion.div>
      )}

      {/* Subreddit Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {activeSubreddit ? `r/${activeSubreddit.name}` : 'Dashboard'}
          </h2>
          {activeSubreddit && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeSubreddit.subscriberCount?.toLocaleString()} subscribers
              <span className="mx-2 text-white/20">|</span>
              {activeSubreddit.activeUserCount?.toLocaleString()} active now
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Pending Queue',
            value: queue?.total?.toString() || realtime?.pendingQueue?.toString() || '—',
            icon: Inbox,
            trend: null,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            urgent: (queue?.total || 0) > 10,
          },
          {
            label: 'AI Actions Today',
            value: metrics?.actionsApplied ? Math.floor(metrics.actionsApplied / 7).toLocaleString() : '—',
            icon: Zap,
            trend: '+12%',
            trendUp: true,
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
          },
          {
            label: 'Spam Blocked',
            value: metrics?.spamBlocked ? Math.floor(metrics.spamBlocked / 7).toLocaleString() : '—',
            icon: Shield,
            trend: '+41%',
            trendUp: true,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Hours Saved',
            value: metrics ? `${metrics.moderatorTimeSavedHours.toFixed(0)}h` : '—',
            icon: Clock,
            trend: 'this week',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            custom={i}
            variants={CARD_VARIANTS}
            initial="hidden"
            animate="visible"
            className="metric-card"
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center`}>
                <metric.icon className={`w-4.5 h-4.5 ${metric.color}`} />
              </div>
              {metric.urgent && (
                <span className="badge badge-danger text-[10px]">Urgent</span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
            {metric.trend && (
              <div className="flex items-center gap-1">
                {metric.trendUp !== undefined ? (
                  metric.trendUp ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )
                ) : null}
                <span className={`text-xs ${metric.trendUp !== undefined ? (metric.trendUp ? 'text-emerald-400' : 'text-red-400') : 'text-muted-foreground'}`}>
                  {metric.trend}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Toxicity Trend */}
        <motion.div
          custom={4}
          variants={CARD_VARIANTS}
          initial="hidden"
          animate="visible"
          className="glass-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-sm text-foreground">Toxicity Trend</p>
              <p className="text-xs text-muted-foreground">7-day average toxicity score</p>
            </div>
            <span className="badge badge-muted text-[10px]">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={toxicityTrend.map((d: Record<string, unknown>, i: number) => ({
              name: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
              score: Number(d.score || 0),
            }))}>
              <defs>
                <linearGradient id="toxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a60fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4a60fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 1]} tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="score" stroke="#4a60fa" strokeWidth={2} fill="url(#toxGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Community Health */}
        <motion.div
          custom={5}
          variants={CARD_VARIANTS}
          initial="hidden"
          animate="visible"
          className="glass-card p-5"
        >
          <p className="font-semibold text-sm text-foreground mb-1">Community Health</p>
          <p className="text-xs text-muted-foreground mb-5">Overall subreddit scores</p>
          <div className="space-y-4">
            {[
              { label: 'Engagement Quality', value: metrics?.engagementQualityScore || 0.68, color: 'from-brand-500 to-purple-500' },
              { label: 'Toxicity Control', value: 1 - (metrics?.falsePositiveRate || 0.04), color: 'from-emerald-500 to-teal-500' },
              { label: 'Mod Efficiency', value: 1 - (metrics?.moderatorWorkloadScore || 0.45), color: 'from-yellow-500 to-orange-500' },
              { label: 'Community Health', value: metrics?.communityHealthScore || 0.72, color: 'from-pink-500 to-rose-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium text-foreground">{Math.round(item.value * 100)}%</span>
                </div>
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom row: Queue preview + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue Preview */}
        <motion.div custom={6} variants={CARD_VARIANTS} initial="hidden" animate="visible" className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm text-foreground">Priority Queue</p>
            <a href="/queue" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all</a>
          </div>
          <div className="space-y-2">
            {queue?.items?.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.priority === 'critical' ? 'bg-red-400 animate-pulse' :
                  item.priority === 'high' ? 'bg-orange-400' :
                  item.priority === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{item.contentPreview}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">u/{item.authorUsername}</span>
                    <span className="badge badge-danger text-[10px]">{item.aiRecommendation}</span>
                  </div>
                </div>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground text-center py-4">No pending items</p>
            )}
          </div>
        </motion.div>

        {/* Moderation Activity */}
        <motion.div custom={7} variants={CARD_VARIANTS} initial="hidden" animate="visible" className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm text-foreground">24h Activity</p>
            <span className="badge badge-brand text-[10px]">Auto vs Manual</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={activityData.filter((_, i) => i % 2 === 0)} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: '#6b7897', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7897', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="auto" fill="#4a60fa" radius={[2, 2, 0, 0]} name="Automated" />
              <Bar dataKey="manual" fill="#7c3aed" radius={[2, 2, 0, 0]} name="Manual" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* AI Insights */}
      {analyticsData?.data?.data?.report?.insights && (
        <motion.div custom={8} variants={CARD_VARIANTS} initial="hidden" animate="visible" className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-400" />
            <p className="font-semibold text-sm text-foreground">AI Insights</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {analyticsData.data.data.report.insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.type === 'warning' ? 'bg-red-500/5 border-red-500/20' :
                  insight.type === 'achievement' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  'bg-brand-500/5 border-brand-500/20'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {insight.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : insight.type === 'achievement' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Zap className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                {insight.suggestedAction && (
                  <button className="mt-3 text-[10px] font-medium text-brand-400 hover:text-brand-300 transition-colors">
                    Take action
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
