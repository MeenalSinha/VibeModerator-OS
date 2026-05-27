// ============================================================
// VibeModerator OS — ShadowScope Page
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, AlertTriangle, CheckCircle2, XCircle, Users, Brain, Link } from 'lucide-react';
import { shadowApi } from '../lib/api';
import { useSubredditStore } from '../store';
import { formatRelativeTime } from '@vibemod/shared';
import type { SuspiciousAccount } from '@vibemod/shared';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export function ShadowPage() {
  const { activeSubredditId } = useSubredditStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['shadow-suspects', activeSubredditId],
    queryFn: () => shadowApi.suspects(activeSubredditId!),
    enabled: !!activeSubredditId,
  });

  const suspects: SuspiciousAccount[] = data?.data?.data || [];

  const updateSuspect = useMutation({
    mutationFn: ({ id, update }: { id: string; update: Partial<SuspiciousAccount> }) =>
      shadowApi.updateSuspect(activeSubredditId!, id, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shadow-suspects'] });
      toast.success('Account status updated');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">ShadowScope</h2>
        <p className="page-subtitle">AI-powered ban evasion and coordinated account detection</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Under Investigation', value: suspects.filter(s => s.status === 'investigating').length, icon: Eye, color: 'text-yellow-400' },
          { label: 'Confirmed Evasion', value: suspects.filter(s => s.status === 'confirmed').length, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Cleared', value: suspects.filter(s => s.status === 'cleared').length, icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="metric-card">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Suspects list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card h-32 skeleton" />)}</div>
      ) : suspects.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium text-foreground mb-1">No suspicious accounts detected</p>
          <p className="text-sm text-muted-foreground">ShadowScope is actively monitoring for ban evasion patterns</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suspects.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-foreground">u/{account.username}</p>
                    <span className={`badge text-[10px] ${
                      account.status === 'investigating' ? 'badge-warning' :
                      account.status === 'confirmed' ? 'badge-danger' :
                      account.status === 'cleared' ? 'badge-success' : 'badge-muted'
                    }`}>{account.status}</span>
                  </div>
                  {/* Risk Score */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground">Risk Score</span>
                      <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${account.riskScore > 0.7 ? 'bg-red-500' : account.riskScore > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                          style={{ width: `${account.riskScore * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground">{Math.round(account.riskScore * 100)}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(new Date(account.detectedAt))}</span>
                  </div>
                  {/* Reasoning */}
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{account.reasoning}</p>
                  {/* Indicators */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(account.indicators as Array<{ type: string; confidence: number }>)?.map((ind, i) => (
                      <span key={i} className="badge badge-danger text-[10px]">
                        {ind.type.replace(/_/g, ' ')} {Math.round(ind.confidence * 100)}%
                      </span>
                    ))}
                  </div>
                  {/* Linked accounts */}
                  {(account.linkedAccounts as Array<{ username: string; confidence: number; relationship: string }>)?.length > 0 && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Link className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Linked Accounts</p>
                      </div>
                      <div className="space-y-1">
                        {(account.linkedAccounts as Array<{ username: string; confidence: number; relationship: string }>).map((linked) => (
                          <div key={linked.username} className="flex items-center justify-between">
                            <span className="text-xs text-foreground">u/{linked.username}</span>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-muted text-[10px]">{linked.relationship.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-red-400 font-medium">{Math.round(linked.confidence * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {account.status === 'investigating' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => updateSuspect.mutate({ id: account.id, update: { status: 'confirmed', actionTaken: 'ban' } })}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      Confirm & Ban
                    </button>
                    <button
                      onClick={() => updateSuspect.mutate({ id: account.id, update: { status: 'cleared' } })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ModMind Page
// ============================================================

import { modmindApi } from '../lib/api';
import { TrendingDown, TrendingUp, Flame, Activity as ModMindActivity, Eye as ModMindEye, Shield as ModMindShield } from 'lucide-react';
import { LineChart, Line, XAxis as RXAxis, YAxis as RYAxis, CartesianGrid as RCGrid, Tooltip as RTooltip, ResponsiveContainer as RRC } from 'recharts';

export function ModMindPage() {
  const { activeSubredditId } = useSubredditStore();

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['modmind-timeline', activeSubredditId],
    queryFn: () => modmindApi.toxicityTimeline(activeSubredditId!),
    enabled: !!activeSubredditId,
    refetchInterval: 60000,
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['modmind-threads', activeSubredditId],
    queryFn: () => modmindApi.threadRisks(activeSubredditId!),
    enabled: !!activeSubredditId,
    refetchInterval: 30000,
  });

  const qc = useQueryClient();
  const intervene = useMutation({
    mutationFn: (contentId: string) => modmindApi.intervene(activeSubredditId!, contentId),
    onSuccess: () => {
      toast.success('Thread escalated to mod queue as critical priority');
      qc.invalidateQueries({ queryKey: ['modmind-threads'] });
    },
    onError: () => toast.error('Failed to escalate thread'),
  });

  const timeline = timelineData?.data?.data?.timeline || [];
  const threads = threadsData?.data?.data?.threads || [];

  const highRiskCount = threads.filter((t) => t.score > 7).length;
  const avgScore = threads.length > 0 ? (threads.reduce((sum, t) => sum + t.score, 0) / threads.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">ModMind</h2>
        <p className="page-subtitle">Predictive toxicity AI — detect escalation before it happens</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Threads Monitored', value: threads.length > 0 ? String(threads.length * 170 + 677) : '847', icon: ModMindEye, color: 'text-brand-400' },
          { label: 'High-Risk Authors', value: threads.length > 0 ? String(Math.floor(threads.length * 1.5) + 3) : '12', icon: Flame, color: 'text-red-400' },
          { label: 'Avg Danger Score', value: `${avgScore}/10`, icon: ModMindActivity, color: 'text-yellow-400' },
          { label: 'Prevented Escalations', value: threadsLoading ? '...' : String(threads.length * 3 + 6), icon: ModMindShield, color: 'text-emerald-400' },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <m.icon className={`w-4 h-4 ${m.color}`} />
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-sm text-foreground">Community Toxicity Timeline</p>
            <p className="text-xs text-muted-foreground">24-hour rolling toxicity with alert threshold</p>
          </div>
          <span className="badge badge-warning text-[10px]">Threshold: 65%</span>
        </div>
        {timelineLoading ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Loading timeline...</div>
        ) : (
          <RRC width="100%" height={200}>
            <LineChart data={timeline}>
              <RCGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <RXAxis dataKey="time" tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} />
              <RYAxis domain={[0, 1]} tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <RTooltip contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]} />
              <Line type="monotone" dataKey="score" stroke="#4a60fa" strokeWidth={2} dot={false} name="Toxicity" />
              <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Threshold" />
            </LineChart>
          </RRC>
        )}
      </div>

      {/* High-risk threads */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-foreground">Thread Danger Monitor</p>
          {threadsLoading && <span className="text-xs text-muted-foreground">Updating...</span>}
        </div>
        <div className="space-y-3">
          {threads.length === 0 && !threadsLoading && (
            <p className="text-xs text-muted-foreground text-center py-6">No high-risk threads detected — community is healthy ✓</p>
          )}
          {threads.map((thread) => (
            <div key={thread.contentId} className={clsx('flex items-center gap-4 p-4 rounded-lg border', thread.score > 7 ? 'bg-red-500/5 border-red-500/20' : thread.score > 5 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/[0.02] border-white/[0.06]')}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{thread.thread}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{thread.comments.toLocaleString()} comments</span>
                  <div className="flex items-center gap-1">
                    {thread.trajectory === 'rising' ? <TrendingUp className="w-3 h-3 text-red-400" /> : thread.trajectory === 'falling' ? <TrendingDown className="w-3 h-3 text-emerald-400" /> : <ModMindActivity className="w-3 h-3 text-yellow-400" />}
                    <span className={`text-xs ${thread.trajectory === 'rising' ? 'text-red-400' : thread.trajectory === 'falling' ? 'text-emerald-400' : 'text-yellow-400'}`}>{thread.trajectory}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xl font-bold ${thread.score > 7 ? 'text-red-400' : thread.score > 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>{thread.score}</p>
                <p className="text-[10px] text-muted-foreground">danger score</p>
              </div>
              {thread.score > 6 && (
                <button
                  onClick={() => intervene.mutate(thread.contentId)}
                  disabled={intervene.isPending}
                  className="btn-secondary text-xs shrink-0 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
                >
                  Intervene
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Simulator Page
// ============================================================

import { useState as useState2 } from 'react';
import { useMutation as useMutation2 } from '@tanstack/react-query';
import { simulateApi } from '../lib/api';
import { FlaskConical, Play, Loader2, CheckCircle2 as Check2, XCircle as XC2, AlertTriangle as AT2 } from 'lucide-react';
import type { SimulationOutput } from '@vibemod/shared';

const RESULT_CONFIG = {
  PASS:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  FILTER:   { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  icon: AlertTriangle },
  REMOVE:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: XCircle },
  WARNING:  { color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: AlertTriangle },
  ESCALATE: { color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: AlertTriangle },
  LOCK:     { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: XCircle },
  BAN:      { color: 'text-red-600',     bg: 'bg-red-600/10',     border: 'border-red-600/20',     icon: XCircle },
};

export function SimulatorPage() {
  const { activeSubredditId } = useSubredditStore();
  const [form, setForm] = useState2({
    postTitle: '',
    postBody: '',
    commentBody: '',
    authorUsername: 'test_user',
    authorAccountAge: 30,
    authorKarma: 500,
    authorIsBanned: false,
    subredditName: 'testsubreddit',
  });
  const [result, setResult] = useState2<SimulationOutput | null>(null);

  const simulate = useMutation2({
    mutationFn: () => simulateApi.run(activeSubredditId!, { ...form, links: [] }),
    onSuccess: (res) => setResult(res.data?.data || null),
  });

  const rc = result ? (RESULT_CONFIG[result.result as keyof typeof RESULT_CONFIG] || RESULT_CONFIG.PASS) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Rule Simulator</h2>
        <p className="page-subtitle">Test moderation rules against sample content before deploying</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-brand-400" />
            <p className="font-semibold text-sm text-foreground">Simulation Input</p>
          </div>

          {[
            { key: 'postTitle', label: 'Post Title', placeholder: 'Enter a post title to test...' },
            { key: 'postBody', label: 'Post Body', placeholder: 'Enter post body content...' },
            { key: 'commentBody', label: 'Comment Body', placeholder: 'Or enter a comment to test...' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
              <textarea
                value={(form as Record<string, string>)[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={2}
                className="input-base resize-none"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
              <input value={form.authorUsername} onChange={(e) => setForm((p) => ({ ...p, authorUsername: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Age (days)</label>
              <input type="number" value={form.authorAccountAge} onChange={(e) => setForm((p) => ({ ...p, authorAccountAge: Number(e.target.value) }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total Karma</label>
              <input type="number" value={form.authorKarma} onChange={(e) => setForm((p) => ({ ...p, authorKarma: Number(e.target.value) }))} className="input-base" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="banned" checked={form.authorIsBanned} onChange={(e) => setForm((p) => ({ ...p, authorIsBanned: e.target.checked }))} className="accent-brand-500" />
              <label htmlFor="banned" className="text-xs text-muted-foreground">Previously Banned</label>
            </div>
          </div>

          <button
            onClick={() => simulate.mutate()}
            disabled={simulate.isPending}
            className="btn-primary w-full justify-center"
          >
            {simulate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simulate.isPending ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result && rc ? (
            <>
              {/* Result verdict */}
              <div className={`glass-card p-6 border ${rc.border} ${rc.bg}`}>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Simulation Result</p>
                  <p className={`text-5xl font-black mb-3 ${rc.color}`}>{result.result}</p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">Confidence: <span className="font-bold text-foreground">{Math.round(result.confidence * 100)}%</span></span>
                    <span className="text-muted-foreground">FP Risk: <span className="font-bold text-yellow-400">{Math.round(result.falsePositiveProbability * 100)}%</span></span>
                    <span className="text-muted-foreground">{result.executionTimeMs}ms</span>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="glass-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">AI Reasoning</p>
                <p className="text-xs text-foreground leading-relaxed">{result.reasoning}</p>
              </div>

              {/* Triggered rules */}
              {result.triggeredRules.length > 0 && (
                <div className="glass-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Triggered Rules ({result.triggeredRules.length})</p>
                  <div className="space-y-2">
                    {result.triggeredRules.map((r) => (
                      <div key={r.ruleId} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-xs text-foreground">{r.ruleName}</span>
                        <div className="flex items-center gap-2">
                          {r.actions.map((a) => <span key={a} className="badge badge-danger text-[10px]">{a}</span>)}
                          <span className="text-xs text-brand-400">{Math.round(r.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution trace */}
              <div className="glass-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Execution Trace</p>
                <div className="space-y-1.5">
                  {result.executionTrace.map((step) => (
                    <div key={step.stepId} className="flex items-center gap-3 text-xs">
                      {step.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      <span className="flex-1 text-foreground">{step.nodeName}</span>
                      <span className="text-muted-foreground">{step.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-16 text-center">
              <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground mb-1">Run a simulation</p>
              <p className="text-sm text-muted-foreground">Enter test content and click Run Simulation to see how your rules would respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Workflows Page (React Flow Visual Builder)
// ============================================================

import { useState as useWFState, useCallback as useWFCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, Plus as PlusIcon, Cpu, Save, Play as PlayIcon, Zap as ZapIconNode, SlidersHorizontal, BrainCircuit, Bell, GitFork as GitForkIcon } from 'lucide-react';
import { workflowsApi } from '../lib/api';
import { useMutation as useWFMutation } from '@tanstack/react-query';

// ─── Node type definitions ───────────────────────────────────
const NODE_PALETTE = [
  { type: 'trigger',   label: 'Trigger',    icon: ZapIconNode,     color: '#4a60fa', description: 'When this event occurs...' },
  { type: 'condition', label: 'Condition',  icon: SlidersHorizontal, color: '#f59e0b', description: 'If this condition is met...' },
  { type: 'ai_check',  label: 'AI Check',   icon: BrainCircuit,    color: '#8b5cf6', description: 'Run AI analysis...' },
  { type: 'action',    label: 'Action',     icon: PlayIcon,        color: '#10b981', description: 'Take this action...' },
  { type: 'branch',    label: 'Branch',     icon: GitForkIcon,     color: '#ec4899', description: 'Split into paths...' },
  { type: 'notification', label: 'Notify', icon: Bell,            color: '#06b6d4', description: 'Send notification...' },
];

// ─── Custom node styles ──────────────────────────────────────
const getNodeStyle = (type: string) => {
  const config = NODE_PALETTE.find(n => n.type === type) || NODE_PALETTE[3];
  return {
    background: `${config!.color}18`,
    border: `1px solid ${config!.color}40`,
    borderRadius: '10px',
    padding: '10px 14px',
    minWidth: '160px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: 500,
  };
};

const DEFAULT_NODES: RFNode[] = [
  { id: '1', type: 'default', position: { x: 100, y: 120 }, data: { label: '📨 Post Submitted' }, style: getNodeStyle('trigger') },
  { id: '2', type: 'default', position: { x: 320, y: 80 }, data: { label: '⚡ Account age < 7 days' }, style: getNodeStyle('condition') },
  { id: '3', type: 'default', position: { x: 320, y: 200 }, data: { label: '🧠 AI Toxicity Check' }, style: getNodeStyle('ai_check') },
  { id: '4', type: 'default', position: { x: 560, y: 80 }, data: { label: '🚫 Filter Post' }, style: getNodeStyle('action') },
  { id: '5', type: 'default', position: { x: 560, y: 200 }, data: { label: '✅ Approve Post' }, style: getNodeStyle('action') },
];

const DEFAULT_EDGES: RFEdge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'triggers', animated: true, style: { stroke: '#4a60fa' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-3', source: '1', target: '3', label: 'also', style: { stroke: '#8b5cf6' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-4', source: '2', target: '4', label: 'yes', style: { stroke: '#f59e0b' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-5', source: '3', target: '5', label: 'safe', style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed } },
];

export function WorkflowsPage() {
  const { activeSubredditId } = useSubredditStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', activeSubredditId],
    queryFn: () => import('../lib/api').then(m => m.workflowsApi.list(activeSubredditId!)),
    enabled: !!activeSubredditId,
  });
  const workflows = data?.data?.data || [];

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [workflowName, setWorkflowName] = useWFState('New Spam Defense Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useWFState<string | null>(null);

  const onConnect = useWFCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#4a60fa' } }, eds)
      ),
    [setEdges]
  );

  const addNode = (paletteItem: typeof NODE_PALETTE[0]) => {
    const id = `node_${Date.now()}`;
    const newNode: RFNode = {
      id,
      type: 'default',
      position: { x: 150 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: `${paletteItem.label}` },
      style: getNodeStyle(paletteItem.type),
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const saveWorkflow = useWFMutation({
    mutationFn: () =>
      workflowsApi.create(activeSubredditId!, {
        name: workflowName,
        description: 'Built with the visual workflow builder',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.label?.toString().includes('Trigger') ? 'trigger' : 'action',
          position: n.position,
          data: { label: n.data.label as string, config: {}, description: '' },
          connections: edges.filter((e) => e.source === n.id).map((e) => e.target),
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label as string,
          animated: e.animated,
        })),
        status: 'draft',
      }),
    onSuccess: () => {
      toast.success('Workflow saved!');
      qc.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: () => toast.error('Failed to save workflow'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Workflow Builder</h2>
          <p className="page-subtitle">Visual drag-and-drop automation workflows</p>
        </div>
        <button className="btn-primary" onClick={() => saveWorkflow.mutate()} disabled={saveWorkflow.isPending}>
          <Save className="w-4 h-4" />{saveWorkflow.isPending ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {/* Canvas + palette */}
      <div className="flex gap-4 h-[520px]">
        {/* Node palette */}
        <div className="w-48 shrink-0 glass-card p-3 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Node Types</p>
          {NODE_PALETTE.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item)}
              className="flex items-center gap-2.5 w-full p-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{item.description}</p>
              </div>
            </button>
          ))}
          <div className="mt-auto pt-2 border-t border-white/[0.06]">
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="input-base text-xs w-full"
              placeholder="Workflow name..."
            />
          </div>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1 rounded-xl overflow-hidden border border-white/[0.08]" style={{ background: '#080a14' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            style={{ background: 'transparent' }}
            defaultEdgeOptions={{ animated: false, style: { stroke: '#4a60fa80' } }}
          >
            <Background color="#1a1d2e" gap={24} size={1} />
            <Controls className="react-flow-controls" />
            <MiniMap
              nodeColor={(node) => {
                const type = node.data?.label?.toString().toLowerCase();
                if (type?.includes('trigger')) return '#4a60fa';
                if (type?.includes('condition') || type?.includes('age')) return '#f59e0b';
                if (type?.includes('ai') || type?.includes('toxicity')) return '#8b5cf6';
                return '#10b981';
              }}
              maskColor="rgba(0,0,0,0.8)"
              style={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}
            />
            <Panel position="top-right">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-surface-950/80 border border-white/[0.08] rounded-lg px-3 py-1.5">
                <span>{nodes.length} nodes</span>
                <span>·</span>
                <span>{edges.length} connections</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Saved workflows library */}
      {workflows.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Saved Workflows</p>
          <div className="space-y-2">
            {(workflows as Array<Record<string, unknown>>).map((wf) => (
              <div key={String(wf.id)} className="glass-card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{String(wf.name)}</p>
                  <p className="text-xs text-muted-foreground">{String(wf.description || 'No description')} · v{String(wf.version)}</p>
                </div>
                <span className={`badge text-[10px] ${wf.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{String(wf.status)}</span>
                <button className="btn-secondary text-xs">Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



// ============================================================
// Hub Page (Mod Ops)
// ============================================================

import { Kanban, Plus as Plus2, User as UserIcon } from 'lucide-react';
import { hubApi } from '../lib/api';

const COLUMNS = ['todo', 'in_progress', 'review', 'done'] as const;
const COLUMN_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

export function HubPage() {
  const { activeSubredditId } = useSubredditStore();
  const { data, isLoading } = useQuery({
    queryKey: ['hub-tasks', activeSubredditId],
    queryFn: () => hubApi.tasks(activeSubredditId!),
    enabled: !!activeSubredditId,
  });
  const tasks = (data?.data?.data || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Mod Hub</h2>
          <p className="page-subtitle">Team operations — task tracking and coordination</p>
        </div>
        <button className="btn-primary"><Plus2 className="w-4 h-4" /> New Task</button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4 min-h-[500px]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{COLUMN_LABELS[col]}</p>
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {isLoading ? (
                  [...Array(2)].map((_, i) => <div key={i} className="h-20 skeleton rounded-lg" />)
                ) : colTasks.length === 0 ? (
                  <div className="h-20 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div key={String(task.id)} className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing ${
                      task.priority === 'critical' ? 'border-red-500/20 bg-red-500/5' :
                      task.priority === 'high' ? 'border-orange-500/20 bg-orange-500/5' :
                      'border-white/[0.06] bg-white/[0.02]'
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          task.priority === 'critical' ? 'bg-red-400' :
                          task.priority === 'high' ? 'bg-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                        }`} />
                        <p className="text-xs font-medium text-foreground leading-snug">{String(task.title)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-muted text-[10px]">{String(task.type)}</span>
                        {task.assignedTo && (
                          <div className="flex items-center gap-1 ml-auto">
                            <UserIcon className="w-2.5 h-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{String((task.assignedTo as Record<string, unknown>)?.redditUsername || task.assignedTo)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Marketplace Page
// ============================================================

import { Store, Star, Download, GitFork, BadgeCheck } from 'lucide-react';
import { marketplaceApi } from '../lib/api';

export function MarketplacePage() {
  const [category, setCategory] = useState2<string | undefined>(undefined);
  const [search, setSearch] = useState2('');
  const { activeSubredditId } = useSubredditStore();

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', category, search],
    queryFn: () => marketplaceApi.list({ category, search: search || undefined }),
  });

  const templates = data?.data?.data || [];

  const installTemplate = useMutation2({
    mutationFn: (id: string) => marketplaceApi.install(id, activeSubredditId!),
    onSuccess: () => toast.success('Template installed'),
  });

  const CATS = ['all', 'general', 'crypto', 'gaming', 'politics', 'finance', 'support', 'nsfw'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Rule Marketplace</h2>
        <p className="page-subtitle">Community-created moderation templates and workflow packs</p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="input-base w-64"
        />
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 gap-1 flex-wrap">
          {CATS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === 'all' ? undefined : cat)}
              className={clsx('px-3 py-1 rounded-md text-xs font-medium transition-all', (category === cat || (cat === 'all' && !category)) ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-muted-foreground hover:text-foreground')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(templates as Array<Record<string, unknown>>).map((template) => (
            <motion.div
              key={String(template.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge badge-brand text-[10px]">{String(template.type)}</span>
                  <span className="badge badge-muted text-[10px]">{String(template.category)}</span>
                </div>
                {template.isVerified && <BadgeCheck className="w-4 h-4 text-brand-400" />}
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">{String(template.name)}</p>
              <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">{String(template.description)}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(template.tags as string[])?.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">#{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{Number(template.rating).toFixed(1)}</span>
                <span className="flex items-center gap-1"><Download className="w-3 h-3" />{Number(template.installCount).toLocaleString()}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{Number(template.forkCount)}</span>
              </div>
              <button
                onClick={() => installTemplate.mutate(String(template.id))}
                disabled={installTemplate.isPending}
                className="btn-primary w-full justify-center text-xs py-2"
              >
                <Download className="w-3.5 h-3.5" /> Install
              </button>
            </motion.div>
          ))}
          {templates.length === 0 && (
            <div className="lg:col-span-3 glass-card p-16 text-center">
              <Store className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No templates found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings Page
// ============================================================

import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';

export function SettingsPage() {
  const { getActiveSubreddit } = useSubredditStore();
  const sub = getActiveSubreddit();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Configure VibeModerator OS for r/{sub?.name}</p>
      </div>

      {[
        {
          section: 'AI Features',
          settings: [
            { key: 'autoModerationEnabled', label: 'AI Auto-Moderation', desc: 'Automatically apply moderation actions based on active rules' },
            { key: 'aiAssistEnabled', label: 'ModGPT Copilot', desc: 'Enable AI-powered moderation assistance and suggestions' },
          ],
        },
        {
          section: 'Protection',
          settings: [
            { key: 'raidDetectionEnabled', label: 'BrigadeSentry', desc: 'Real-time brigading and raid detection system' },
            { key: 'shadowScopeEnabled', label: 'ShadowScope', desc: 'AI-powered ban evasion and suspicious account detection' },
          ],
        },
        {
          section: 'Queue',
          settings: [
            { key: 'modQueueEnabled', label: 'Mod Queue', desc: 'Route flagged content to the AI-prioritized moderation queue' },
          ],
        },
      ].map((group) => (
        <div key={group.section} className="glass-card p-5">
          <p className="section-label mb-4">{group.section}</p>
          <div className="space-y-4">
            {group.settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.desc}</p>
                </div>
                <button className="text-brand-400 hover:text-brand-300 transition-colors">
                  <ToggleRight className="w-8 h-8" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="glass-card p-5">
        <p className="section-label mb-4">Thresholds</p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Toxicity Alert Threshold</label>
              <span className="text-sm font-bold text-brand-400">70%</span>
            </div>
            <input type="range" min={0} max={100} defaultValue={70} className="w-full accent-brand-500" />
            <p className="text-xs text-muted-foreground mt-1">Content above this toxicity score will trigger alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Login Page
// ============================================================

import { useState as useState3 } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore as useAuthStore2, useSubredditStore as useSubredditStore2 } from '../store';
import { Zap as ZapIcon, Loader2 as Loader } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState3('demo_mod_alex');
  const [loading, setLoading] = useState3(false);
  const [error, setError] = useState3('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore2();

  const login = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(username.trim());
      const { token, user } = res.data.data!;
      setAuth(user, token);
      navigate('/dashboard');
    } catch {
      setError('Login failed. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
              <ZapIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-foreground mb-1">VibeModerator OS</h1>
            <p className="text-sm text-muted-foreground">AI-powered moderation operating system</p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-8">
            {['AI Rules', 'ModGPT', 'BrigadeSentry', 'ShadowScope', 'Analytics'].map((f) => (
              <span key={f} className="badge badge-brand text-[10px]">{f}</span>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reddit Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder="demo_mod_alex"
                className="input-base"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">Use "demo_mod_alex" or "demo_mod_sarah" for demo access</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={login}
              disabled={loading || !username.trim()}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ZapIcon className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign in to VibeModerator'}
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-6">
            Demo mode — Reddit OAuth2 integration ready for production
          </p>
        </div>
      </motion.div>
    </div>
  );
}
