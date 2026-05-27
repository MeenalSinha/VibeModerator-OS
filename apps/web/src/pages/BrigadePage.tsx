// ============================================================
// VibeModerator OS — BrigadeSentry Page
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Siren, Shield, AlertTriangle, CheckCircle2, Clock,
  Users, Activity, ExternalLink, Lock, Zap
} from 'lucide-react';
import { brigadeApi } from '../lib/api';
import { useSubredditStore } from '../store';
import { formatRelativeTime } from '@vibemod/shared';
import type { RaidEvent } from '@vibemod/shared';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SEVERITY_CONFIG = {
  low:      { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  medium:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  high:     { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-400 animate-pulse' },
  critical: { color: 'text-red-500',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    dot: 'bg-red-500 animate-ping' },
};

// Simulated radar data for "threat profile"
const RADAR_DATA = [
  { metric: 'Traffic Spike', value: 82 },
  { metric: 'New Accounts', value: 91 },
  { metric: 'Coordination', value: 67 },
  { metric: 'Sentiment', value: 55 },
  { metric: 'Vote Anomaly', value: 44 },
  { metric: 'External Links', value: 78 },
];

// Simulated live traffic data
const LIVE_TRAFFIC = Array.from({ length: 20 }, (_, i) => ({
  time: `${i * 3}m`,
  normal: Math.floor(40 + Math.random() * 20),
  spike: i >= 13 ? Math.floor(120 + Math.random() * 80) : Math.floor(40 + Math.random() * 20),
}));

export function BrigadePage() {
  const { activeSubredditId } = useSubredditStore();
  const qc = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ['brigade-status', activeSubredditId],
    queryFn: () => brigadeApi.status(activeSubredditId!),
    enabled: !!activeSubredditId,
    refetchInterval: 10000,
  });

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['brigade-events', activeSubredditId],
    queryFn: () => brigadeApi.events(activeSubredditId!),
    enabled: !!activeSubredditId,
  });

  const resolveEvent = useMutation({
    mutationFn: (eventId: string) => brigadeApi.resolve(activeSubredditId!, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brigade-events', activeSubredditId] });
      qc.invalidateQueries({ queryKey: ['brigade-status', activeSubredditId] });
      toast.success('Raid event marked as contained');
    },
  });

  const status = statusData?.data?.data;
  const events: RaidEvent[] = eventsData?.data?.data || [];
  const activeEvent = events.find((e) => e.status === 'active' || e.status === 'suspected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">BrigadeSentry</h2>
          <p className="page-subtitle">Real-time anti-brigading defense system</p>
        </div>
        <div className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium',
          status?.isActive
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        )}>
          <div className={clsx('w-2 h-2 rounded-full', status?.isActive ? 'bg-red-400 animate-ping' : 'bg-emerald-400')} />
          {status?.isActive ? 'Brigade Active' : 'All Clear'}
        </div>
      </div>

      {/* Active Alert Banner */}
      <AnimatePresence>
        {status?.isActive && activeEvent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-xl bg-red-500/10 border border-red-500/30"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5 text-red-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-400 mb-1">
                  Active Brigade — {activeEvent.severity?.toUpperCase()} Severity
                </p>
                <p className="text-sm text-red-400/70 mb-3">
                  {activeEvent.usersInvolved} accounts involved
                  {activeEvent.suspectedOrigin ? ` · Suspected origin: ${activeEvent.suspectedOrigin}` : ''}
                  {' · '}Detected {formatRelativeTime(new Date(activeEvent.detectedAt))}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(activeEvent.indicators as Array<{ type: string; description: string; confidence: number }>)?.map((ind, i) => (
                    <span key={i} className="badge badge-danger text-[10px]">
                      {ind.type.replace(/_/g, ' ')} ({Math.round(ind.confidence * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => resolveEvent.mutate(activeEvent.id)}
                  className="btn-secondary text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Contained
                </button>
                <button className="btn-secondary text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Lock className="w-3.5 h-3.5" />
                  Enable Slow Mode
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Traffic Level', value: status?.isActive ? '340%' : '98%', sub: 'of baseline', icon: Activity, alert: status?.isActive },
          { label: 'New Accounts', value: status?.isActive ? '47' : '3', sub: 'last 10 min', icon: Users, alert: status?.isActive },
          { label: 'Report Rate', value: status?.isActive ? '12x' : '1x', sub: 'above normal', icon: AlertTriangle, alert: status?.isActive },
          { label: 'Response Time', value: '< 30s', sub: 'detection lag', icon: Clock, alert: false },
        ].map((metric) => (
          <div
            key={metric.label}
            className={clsx('metric-card', metric.alert && 'border border-red-500/20 bg-red-500/5')}
          >
            <metric.icon className={clsx('w-4 h-4', metric.alert ? 'text-red-400' : 'text-brand-400')} />
            <p className={clsx('text-2xl font-bold', metric.alert ? 'text-red-400' : 'text-foreground')}>
              {metric.value}
            </p>
            <p className="text-xs text-muted-foreground">{metric.label} · {metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live traffic chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-sm text-foreground">Live Traffic Monitor</p>
              <p className="text-xs text-muted-foreground">Posts + comments per 3-minute window</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={LIVE_TRAFFIC}>
              <defs>
                <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spikeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7897', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="normal" stroke="#10b981" strokeWidth={2} fill="url(#normalGrad)" name="Baseline" />
              <Area type="monotone" dataKey="spike" stroke="#ef4444" strokeWidth={2} fill="url(#spikeGrad)" name="Actual" strokeDasharray={status?.isActive ? undefined : '5 5'} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Radar */}
        <div className="glass-card p-5">
          <p className="font-semibold text-sm text-foreground mb-1">Threat Profile</p>
          <p className="text-xs text-muted-foreground mb-3">Multi-signal brigade indicators</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7897', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Threat Level"
                dataKey="value"
                stroke={status?.isActive ? '#ef4444' : '#4a60fa'}
                fill={status?.isActive ? '#ef4444' : '#4a60fa'}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event History */}
      <div className="glass-card p-5">
        <p className="font-semibold text-sm text-foreground mb-4">Brigade Event History</p>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-lg" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No brigade events recorded</p>
            <p className="text-xs text-muted-foreground">BrigadeSentry is actively monitoring for threats</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const sev = SEVERITY_CONFIG[event.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${sev.bg} ${sev.border}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={`text-sm font-semibold ${sev.color}`}>
                        {event.severity?.charAt(0).toUpperCase() + event.severity?.slice(1)} Brigade
                      </p>
                      <span className={`badge text-[10px] ${
                        event.status === 'active' ? 'badge-danger' :
                        event.status === 'contained' ? 'badge-success' : 'badge-warning'
                      }`}>{event.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.usersInvolved} accounts · {(event.indicators as unknown[])?.length || 0} indicators detected
                      {event.suspectedOrigin ? ` · Origin: ${event.suspectedOrigin}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatRelativeTime(new Date(event.detectedAt))}
                      {event.resolvedAt ? ` · Resolved ${formatRelativeTime(new Date(event.resolvedAt))}` : ''}
                    </p>
                  </div>
                  {(event.status === 'active' || event.status === 'suspected') && (
                    <button
                      onClick={() => resolveEvent.mutate(event.id)}
                      className="btn-secondary text-xs shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
