// ============================================================
// VibeModerator OS — Mod Queue Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, CheckCircle2, XCircle, Flag, Eye, Filter,
  ChevronDown, MessageSquare, User, Sparkles, AlertTriangle,
  MoreHorizontal, Clock, Zap
} from 'lucide-react';
import { queueApi } from '../lib/api';
import { useSubredditStore } from '../store';
import { formatRelativeTime } from '@vibemod/shared';
import type { ModQueueItem } from '@vibemod/shared';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', dot: 'bg-red-500 animate-pulse', badge: 'badge-danger', border: 'border-l-red-500' },
  high:     { label: 'High',     dot: 'bg-orange-400',            badge: 'badge-warning', border: 'border-l-orange-400' },
  medium:   { label: 'Medium',   dot: 'bg-yellow-400',            badge: 'badge-warning border-yellow-500/30 text-yellow-400 bg-yellow-500/20', border: 'border-l-yellow-400' },
  low:      { label: 'Low',      dot: 'bg-emerald-400',           badge: 'badge-success', border: 'border-l-emerald-400' },
};

const ACTION_COLORS: Record<string, string> = {
  remove:  'bg-red-500 hover:bg-red-600',
  approve: 'bg-emerald-500 hover:bg-emerald-600',
  warn:    'bg-yellow-500 hover:bg-yellow-600',
  filter:  'bg-orange-500 hover:bg-orange-600',
  escalate:'bg-purple-500 hover:bg-purple-600',
  ban:     'bg-red-700 hover:bg-red-800',
};

export function QueuePage() {
  const { activeSubredditId } = useSubredditStore();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['queue', activeSubredditId, statusFilter, priorityFilter],
    queryFn: () => queueApi.list(activeSubredditId!, {
      status: statusFilter,
      ...(priorityFilter ? { priority: priorityFilter } : {}),
      limit: 25,
    }),
    enabled: !!activeSubredditId,
    refetchInterval: 20000,
  });

  const items: ModQueueItem[] = data?.data?.data?.items || [];
  const total = data?.data?.data?.total || 0;

  const actionItem = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: string }) =>
      queueApi.update(activeSubredditId!, itemId, { status: 'resolved', resolvedAction: action }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      toast.success(`Item ${action}d`);
    },
  });

  const bulkAction = useMutation({
    mutationFn: (action: string) =>
      queueApi.bulkAction(activeSubredditId!, Array.from(selectedItems), action),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      setSelectedItems(new Set());
      toast.success(`${selectedItems.size} items ${action}d`);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Moderation Queue</h2>
          <p className="page-subtitle">{total} items • AI-prioritized and analyzed</p>
        </div>
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedItems.size} selected</span>
            {['approve', 'remove', 'filter'].map((action) => (
              <button
                key={action}
                onClick={() => bulkAction.mutate(action)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${ACTION_COLORS[action]}`}
              >
                Bulk {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 gap-1">
          {['pending', 'in_progress', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1">
          {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                priorityFilter === p
                  ? `${PRIORITY_CONFIG[p].badge} border-current`
                  : 'border-white/10 text-muted-foreground hover:text-foreground bg-white/5'
              )}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
              {p}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-brand-400" />
          AI-sorted by risk
        </div>
      </div>

      {/* Queue Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card h-24 skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <p className="font-medium text-foreground mb-1">Queue is clear</p>
          <p className="text-sm text-muted-foreground">All {statusFilter} items have been handled.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <QueueItemCard
                item={item}
                isSelected={selectedItems.has(item.id)}
                isExpanded={expandedItem === item.id}
                onSelect={() => toggleSelect(item.id)}
                onExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                onAction={(action) => actionItem.mutate({ itemId: item.id, action })}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Queue Item Card
// ============================================================

function QueueItemCard({
  item, isSelected, isExpanded, onSelect, onExpand, onAction
}: {
  item: ModQueueItem;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onAction: (action: string) => void;
}) {
  const priority = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.low;
  const toxicityPercent = Math.round(item.toxicityScore * 100);

  return (
    <div className={clsx(
      'glass-card border-l-2 transition-all',
      priority.border,
      isSelected && 'border border-brand-500/30 bg-brand-500/5',
    )}>
      <div className="flex items-start gap-4 p-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-brand-500 cursor-pointer shrink-0"
        />

        {/* Type icon */}
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          {item.type === 'post' ? (
            <Flag className="w-4 h-4 text-muted-foreground" />
          ) : item.type === 'comment' ? (
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">u/{item.authorUsername}</span>
            <span className={`badge ${priority.badge} text-[10px]`}>{item.priority}</span>
            <span className="badge badge-muted text-[10px]">{item.type}</span>
            {item.assignedTo && (
              <span className="badge badge-brand text-[10px]">assigned: {item.assignedTo}</span>
            )}
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{item.contentPreview}</p>

          {/* AI Analysis preview */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span className="text-[10px] text-muted-foreground">AI: </span>
              <span className={`text-[10px] font-medium ${
                item.aiRecommendation === 'remove' || item.aiRecommendation === 'ban' ? 'text-red-400' :
                item.aiRecommendation === 'approve' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>
                {item.aiRecommendation}
              </span>
              <span className="text-[10px] text-muted-foreground">({Math.round(item.aiConfidence * 100)}%)</span>
            </div>
            {item.toxicityScore > 0 && (
              <div className="flex items-center gap-1.5">
                <div className={`w-12 h-1 rounded-full bg-surface-800 overflow-hidden`}>
                  <div
                    className={`h-full rounded-full ${
                      item.toxicityScore > 0.7 ? 'bg-red-500' :
                      item.toxicityScore > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${toxicityPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{toxicityPercent}% toxic</span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatRelativeTime(new Date(item.reportedAt))}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAction('approve')}
            className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
            title="Approve"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAction('remove')}
            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
            title="Remove"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExpand}
            className="w-8 h-8 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/8 flex items-center justify-center transition-colors"
            title="Expand"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-4 py-4 space-y-4">
              {/* AI Reasoning */}
              <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/15">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <p className="text-xs font-semibold text-brand-400">AI Analysis</p>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {Math.round(item.aiConfidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.aiReasoning}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {['approve', 'remove', 'warn', 'filter', 'escalate'].map((action) => (
                  <button
                    key={action}
                    onClick={() => onAction(action)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${ACTION_COLORS[action] || 'bg-surface-700 hover:bg-surface-600'}`}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
