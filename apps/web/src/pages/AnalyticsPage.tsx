// ============================================================
// VibeModerator OS — Analytics Page
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Shield, Clock,
  Zap, AlertTriangle, CheckCircle2, Activity, Users
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { analyticsApi } from '../lib/api';
import { useSubredditStore } from '../store';
import { clsx } from 'clsx';

const PERIOD_OPTIONS = [
  { label: '24h', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

const COLORS = ['#4a60fa', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const TRUST_COLORS = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
  suspicious: '#7f1d1d',
};

export function AnalyticsPage() {
  const { activeSubredditId, getActiveSubreddit } = useSubredditStore();
  const [period, setPeriod] = useState('7d');
  const sub = getActiveSubreddit();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', activeSubredditId, period],
    queryFn: () => analyticsApi.get(activeSubredditId!, period),
    enabled: !!activeSubredditId,
  });

  const report = data?.data?.data?.report;
  const metrics = report?.metrics;
  const toxicityTrends = report?.toxicityTrends || [];
  const moderationActivity = report?.moderationActivity || [];
  const topRules = report?.topRules || [];
  const trustDist = report?.userTrustDistribution;
  const insights = report?.insights || [];

  // Generate chart data
  const toxicityChartData = toxicityTrends.length
    ? toxicityTrends.map((d: Record<string, unknown>, i: number) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7],
        score: Number(d.score || 0),
        posts: Number(d.postCount || 0),
        comments: Number(d.commentCount || 0),
      }))
    : Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        score: 0.2 + Math.random() * 0.4,
        posts: Math.floor(1800 + Math.random() * 800),
        comments: Math.floor(7000 + Math.random() * 3000),
      }));

  const activityChartData = moderationActivity.length
    ? moderationActivity.map((d: Record<string, unknown>, i: number) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7],
        auto: Number(d.autoActions || 0),
        manual: Number(d.manualActions || 0),
      }))
    : Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        auto: Math.floor(120 + Math.random() * 80),
        manual: Math.floor(20 + Math.random() * 30),
      }));

  const trustData = trustDist
    ? [
        { name: 'High Trust', value: Math.round((trustDist.high || 0.62) * 100) },
        { name: 'Medium', value: Math.round((trustDist.medium || 0.24) * 100) },
        { name: 'Low Trust', value: Math.round((trustDist.low || 0.09) * 100) },
        { name: 'Suspicious', value: Math.round((trustDist.suspicious || 0.05) * 100) },
      ]
    : [
        { name: 'High Trust', value: 62 },
        { name: 'Medium', value: 24 },
        { name: 'Low Trust', value: 9 },
        { name: 'Suspicious', value: 5 },
      ];

  const topRulesData = topRules.length
    ? topRules
    : [
        { ruleName: 'Crypto Spam Filter', triggers: 2341, effectiveness: 0.92 },
        { ruleName: 'High Toxicity Remove', triggers: 876, effectiveness: 0.97 },
        { ruleName: 'Low Karma Gate', triggers: 4200, effectiveness: 0.89 },
        { ruleName: 'Link Domain Filter', triggers: 531, effectiveness: 0.85 },
      ];

  const tooltipStyle = {
    contentStyle: {
      background: '#0d0f1a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      fontSize: '12px',
    },
    labelStyle: { color: '#e2e8f0' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Analytics</h2>
          <p className="page-subtitle">
            Community DNA — deep insights for r/{sub?.name}
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                period === opt.value
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Mod Time Saved',
            value: metrics ? `${metrics.moderatorTimeSavedHours.toFixed(0)}h` : '47h',
            sub: 'this period',
            icon: Clock,
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
            trend: '+18%',
            up: true,
          },
          {
            label: 'Toxicity Prevented',
            value: metrics?.toxicityPrevented?.toLocaleString() ?? '892',
            sub: 'incidents',
            icon: Shield,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            trend: '+23%',
            up: true,
          },
          {
            label: 'Spam Blocked',
            value: metrics?.spamBlocked?.toLocaleString() ?? '3,104',
            sub: 'posts & comments',
            icon: Zap,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            trend: '+41%',
            up: true,
          },
          {
            label: 'False Positive Rate',
            value: metrics ? `${(metrics.falsePositiveRate * 100).toFixed(1)}%` : '3.8%',
            sub: 'of AI actions',
            icon: AlertTriangle,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            trend: '-0.6%',
            up: false,
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="metric-card"
          >
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
            <div className="flex items-center gap-1">
              {kpi.up ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-xs ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.trend} vs last period
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toxicity Trend + Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Toxicity area chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-sm text-foreground">Toxicity Score Trend</p>
              <p className="text-xs text-muted-foreground">Daily average toxicity across all content</p>
            </div>
            <span className="badge badge-muted text-[10px]">{period}</span>
          </div>
          {isLoading ? (
            <div className="h-48 skeleton rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={toxicityChartData}>
                <defs>
                  <linearGradient id="toxGradFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a60fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4a60fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Toxicity']} />
                <Area type="monotone" dataKey="score" stroke="#4a60fa" strokeWidth={2} fill="url(#toxGradFull)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User Trust Donut */}
        <div className="glass-card p-5">
          <p className="font-semibold text-sm text-foreground mb-1">User Trust Distribution</p>
          <p className="text-xs text-muted-foreground mb-4">Based on karma, age, and behavior</p>
          {isLoading ? (
            <div className="h-48 skeleton rounded-lg" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={trustData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {trustData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={Object.values(TRUST_COLORS)[index]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number) => [`${v}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {trustData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: Object.values(TRUST_COLORS)[i] }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Moderation Activity + Top Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Moderation activity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-sm text-foreground">Moderation Activity</p>
              <p className="text-xs text-muted-foreground">AI automated vs manual actions</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" />Auto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />Manual</span>
            </div>
          </div>
          {isLoading ? (
            <div className="h-48 skeleton rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityChartData} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="auto" fill="#4a60fa" radius={[3, 3, 0, 0]} name="Automated" />
                <Bar dataKey="manual" fill="#7c3aed" radius={[3, 3, 0, 0]} name="Manual" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Rules */}
        <div className="glass-card p-5">
          <p className="font-semibold text-sm text-foreground mb-1">Top Triggered Rules</p>
          <p className="text-xs text-muted-foreground mb-4">By activation count this period</p>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {topRulesData.map((rule: Record<string, unknown>, i: number) => {
                const maxTriggers = Math.max(...topRulesData.map((r: Record<string, unknown>) => Number(r.triggers)));
                const pct = (Number(rule.triggers) / maxTriggers) * 100;
                return (
                  <div key={String(rule.ruleName || rule.ruleId || i)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-foreground font-medium truncate max-w-[60%]">
                        {String(rule.ruleName || 'Rule')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{Number(rule.triggers).toLocaleString()} triggers</span>
                        <span className="badge badge-success text-[10px]">
                          {Math.round(Number(rule.effectiveness || 0) * 100)}% eff.
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Community Health Scorecard */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-brand-400" />
          <p className="font-semibold text-sm text-foreground">Community Health Scorecard</p>
          <span className="badge badge-brand text-[10px] ml-auto">AI Generated</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Engagement Quality', value: metrics?.engagementQualityScore ?? 0.68, color: 'from-brand-500 to-purple-500', icon: Activity },
            { label: 'Toxicity Control', value: metrics ? 1 - metrics.falsePositiveRate : 0.96, color: 'from-emerald-500 to-teal-500', icon: Shield },
            { label: 'Mod Efficiency', value: metrics ? 1 - (metrics.moderatorWorkloadScore ?? 0.45) : 0.55, color: 'from-yellow-500 to-orange-500', icon: Zap },
            { label: 'User Retention Impact', value: metrics?.userRetentionImpact ?? 0.12, color: 'from-pink-500 to-rose-500', icon: Users },
          ].map((score, i) => (
            <motion.div
              key={score.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center"
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${score.color} flex items-center justify-center mx-auto mb-3`}>
                <score.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {Math.round(score.value * 100)}
                <span className="text-sm text-muted-foreground">/100</span>
              </p>
              <p className="text-xs text-muted-foreground">{score.label}</p>
              <div className="mt-2 h-1 bg-surface-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score.value * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1 + 0.3 }}
                  className={`h-full rounded-full bg-gradient-to-r ${score.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="glass-card p-5">
          <p className="font-semibold text-sm text-foreground mb-4">AI Insights & Recommendations</p>
          <div className="space-y-3">
            {insights.map((insight: Record<string, unknown>) => (
              <div
                key={String(insight.id)}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  insight.type === 'warning' ? 'bg-red-500/5 border-red-500/20' :
                  insight.type === 'achievement' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  'bg-brand-500/5 border-brand-500/20'
                }`}
              >
                {insight.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : insight.type === 'achievement' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Zap className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground mb-0.5">{String(insight.title)}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{String(insight.description)}</p>
                  {insight.suggestedAction && (
                    <p className="text-xs text-brand-400 mt-1.5 font-medium">
                      Suggestion: {String(insight.suggestedAction)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
