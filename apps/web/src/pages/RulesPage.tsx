// ============================================================
// VibeModerator OS — Rules Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Shield, Play, Pause, Trash2,
  ChevronDown, ChevronRight, Loader2, CheckCircle2,
  AlertTriangle, Lightbulb, Info, Settings2
} from 'lucide-react';
import { rulesApi } from '../lib/api';
import { useSubredditStore, useRuleBuilderStore } from '../store';
import { formatConfidence, formatRelativeTime } from '@vibemod/shared';
import type { ModerationRule } from '@vibemod/shared';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export function RulesPage() {
  const { activeSubredditId, getActiveSubreddit } = useSubredditStore();
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const qc = useQueryClient();
  const sub = getActiveSubreddit();

  const { data, isLoading } = useQuery({
    queryKey: ['rules', activeSubredditId],
    queryFn: () => rulesApi.list(activeSubredditId!, { limit: 100 }),
    enabled: !!activeSubredditId,
  });

  const rules: ModerationRule[] = data?.data?.data?.rules || [];

  const toggleStatus = useMutation({
    mutationFn: ({ ruleId, status }: { ruleId: string; status: string }) =>
      rulesApi.update(activeSubredditId!, ruleId, { status: status as ModerationRule['status'] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', activeSubredditId] });
      toast.success('Rule updated');
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => rulesApi.delete(activeSubredditId!, ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', activeSubredditId] });
      toast.success('Rule archived');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Moderation Rules</h2>
          <p className="page-subtitle">
            {rules.filter((r) => r.status === 'active').length} active rules protecting r/{sub?.name}
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: rules.length, icon: Shield, color: 'text-brand-400' },
          { label: 'Active', value: rules.filter((r) => r.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Avg Confidence', value: rules.length ? formatConfidence(rules.reduce((s, r) => s + r.confidence, 0) / rules.length) : '—', icon: Sparkles, color: 'text-purple-400' },
          { label: 'Total Matches', value: rules.reduce((s, r) => s + r.stats.totalMatches, 0).toLocaleString(), icon: CheckCircle2, color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="metric-card">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* AI Rule Builder */}
      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <RuleBuilder
              subredditId={activeSubredditId!}
              subredditName={sub?.name || ''}
              onSuccess={() => {
                setShowBuilder(false);
                qc.invalidateQueries({ queryKey: ['rules', activeSubredditId] });
              }}
              onCancel={() => setShowBuilder(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-20 skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isExpanded={expandedRule === rule.id}
              onToggleExpand={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              onToggleStatus={() => toggleStatus.mutate({
                ruleId: rule.id,
                status: rule.status === 'active' ? 'paused' : 'active',
              })}
              onDelete={() => deleteRule.mutate(rule.id)}
            />
          ))}
          {rules.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground mb-1">No rules yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first AI-powered moderation rule</p>
              <button onClick={() => setShowBuilder(true)} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" /> Create Rule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI Rule Builder
// ============================================================

function RuleBuilder({ subredditId, subredditName, onSuccess, onCancel }: {
  subredditId: string;
  subredditName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { naturalLanguage, parsedPreview, isParsing, setNaturalLanguage, setParsedPreview, setIsParsing, reset } = useRuleBuilderStore();
  const [step, setStep] = useState<'input' | 'preview' | 'saving'>('input');

  const parseRule = async () => {
    if (!naturalLanguage.trim()) return;
    setIsParsing(true);
    try {
      const res = await rulesApi.parse(subredditId, naturalLanguage, { name: subredditName });
      setParsedPreview(res.data.data || null);
      setStep('preview');
    } catch {
      toast.error('Failed to parse rule. Check your OpenAI API key.');
    } finally {
      setIsParsing(false);
    }
  };

  const saveRule = async () => {
    if (!parsedPreview) return;
    setStep('saving');
    try {
      await rulesApi.create(subredditId, {
        ...parsedPreview,
        naturalLanguageInput: naturalLanguage,
        status: 'draft',
      });
      toast.success('Rule created successfully');
      reset();
      onSuccess();
    } catch {
      toast.error('Failed to create rule');
      setStep('preview');
    }
  };

  return (
    <div className="glass-card p-6 border border-brand-500/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">AI Rule Builder</p>
          <p className="text-xs text-muted-foreground">Describe your rule in plain English</p>
        </div>
        <button onClick={onCancel} className="ml-auto text-muted-foreground hover:text-foreground">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Describe your moderation rule</label>
            <textarea
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              placeholder="If a user account is younger than 3 days and posts crypto links, filter the post and comment with our spam warning."
              rows={4}
              className="input-base resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Be specific about conditions (account age, karma, keywords) and actions (remove, warn, filter).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={parseRule}
              disabled={!naturalLanguage.trim() || isParsing}
              className="btn-primary"
            >
              {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isParsing ? 'Analyzing...' : 'Parse with AI'}
            </button>
            <button onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {step === 'preview' && parsedPreview && (
        <div className="space-y-5">
          {/* Rule summary */}
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Rule parsed successfully</p>
            </div>
            <p className="text-xs text-muted-foreground">{parsedPreview.name}</p>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
              <p className="text-2xl font-bold gradient-text">{formatConfidence(parsedPreview.confidence || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Est. False Positive Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {parsedPreview.metadata ? formatConfidence(parsedPreview.metadata.estimatedFalsePositiveRate) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <p className="text-2xl font-bold text-foreground">P{parsedPreview.priority}</p>
            </div>
          </div>

          {/* AI Explanation */}
          {parsedPreview.metadata?.aiExplanation && (
            <div className="p-4 rounded-lg bg-brand-500/5 border border-brand-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-brand-400 mb-1">Why this rule works</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{parsedPreview.metadata.aiExplanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions & Triggers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Actions</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedPreview.actions?.map((action) => (
                  <span key={action} className="badge badge-danger">{action}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Triggers</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedPreview.triggers?.map((trigger) => (
                  <span key={trigger} className="badge badge-brand">{trigger.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {parsedPreview.metadata?.warnings && parsedPreview.metadata.warnings.length > 0 && (
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Potential Issues</p>
                  <ul className="space-y-0.5">
                    {parsedPreview.metadata.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {parsedPreview.metadata?.optimizationSuggestions && parsedPreview.metadata.optimizationSuggestions.length > 0 && (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-purple-400 mb-1">Optimization Suggestions</p>
                  <ul className="space-y-0.5">
                    {parsedPreview.metadata.optimizationSuggestions.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={saveRule} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" /> Save Rule
            </button>
            <button onClick={() => setStep('input')} className="btn-secondary">
              Edit Input
            </button>
            <button onClick={() => { reset(); onCancel(); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <p className="text-sm text-muted-foreground">Creating rule...</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Rule Card
// ============================================================

function RuleCard({
  rule, isExpanded, onToggleExpand, onToggleStatus, onDelete
}: {
  rule: ModerationRule;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const statusColors = {
    active: 'badge-success',
    paused: 'badge-warning',
    draft: 'badge-muted',
    archived: 'badge-muted',
    testing: 'badge-brand',
  };

  return (
    <div className={clsx('glass-card transition-all', isExpanded && 'border-brand-500/20')}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Priority indicator */}
        <div className={`w-1 h-8 rounded-full ${rule.priority === 1 ? 'bg-red-500' : rule.priority === 2 ? 'bg-orange-500' : rule.priority === 3 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground">{rule.name}</p>
            <span className={`badge ${statusColors[rule.status]}`}>{rule.status}</span>
            {rule.metadata?.warnings?.length > 0 && (
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-foreground">{rule.stats.totalMatches.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">matches</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-foreground">{formatConfidence(rule.confidence)}</p>
            <p className="text-[10px] text-muted-foreground">confidence</p>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onToggleStatus}
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                rule.status === 'active'
                  ? 'text-yellow-400 hover:bg-yellow-500/10'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              )}
              title={rule.status === 'active' ? 'Pause rule' : 'Activate rule'}
            >
              {rule.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Archive rule"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/[0.04] mt-0 space-y-4">
              <div className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">Original Rule Input</p>
                <p className="text-xs text-foreground bg-white/[0.03] p-3 rounded-lg border border-white/[0.06] italic">
                  "{rule.naturalLanguageInput}"
                </p>
              </div>

              {rule.metadata.aiExplanation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">AI Explanation</p>
                  <p className="text-xs text-foreground leading-relaxed">{rule.metadata.aiExplanation}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Total Matches</p>
                  <p className="text-lg font-bold text-foreground">{rule.stats.totalMatches.toLocaleString()}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">False Positives</p>
                  <p className="text-lg font-bold text-foreground">{rule.stats.falsePositives}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Last Triggered</p>
                  <p className="text-sm font-medium text-foreground">
                    {rule.stats.lastTriggeredAt ? formatRelativeTime(new Date(rule.stats.lastTriggeredAt)) : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {rule.actions.map((action) => (
                  <span key={action} className="badge badge-danger">{action}</span>
                ))}
                {rule.triggers.map((trigger) => (
                  <span key={trigger} className="badge badge-brand">{trigger.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
