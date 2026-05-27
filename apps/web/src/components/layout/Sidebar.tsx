// ============================================================
// VibeModerator OS — Sidebar
// ============================================================

import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Shield, GitBranch, FlaskConical, BarChart3,
  Brain, Siren, Eye, Inbox, Kanban, Store, Settings,
  ChevronLeft, ChevronRight, Zap, Activity
} from 'lucide-react';
import { useUIStore, useSubredditStore } from '../../store';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'main' },
  { path: '/queue', icon: Inbox, label: 'Mod Queue', badge: 'queue', section: 'main' },
  { path: '/rules', icon: Shield, label: 'Rules', section: 'ai' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows', section: 'ai' },
  { path: '/simulator', icon: FlaskConical, label: 'Simulator', section: 'ai' },
  { path: '/modmind', icon: Brain, label: 'ModMind', section: 'intelligence' },
  { path: '/brigade', icon: Siren, label: 'BrigadeSentry', badge: 'raid', section: 'intelligence' },
  { path: '/shadow', icon: Eye, label: 'ShadowScope', section: 'intelligence' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', section: 'intelligence' },
  { path: '/hub', icon: Kanban, label: 'Mod Hub', section: 'ops' },
  { path: '/marketplace', icon: Store, label: 'Marketplace', section: 'ops' },
  { path: '/settings', icon: Settings, label: 'Settings', section: 'ops' },
];

const SECTIONS = [
  { key: 'main', label: 'Overview' },
  { key: 'ai', label: 'AI Moderation' },
  { key: 'intelligence', label: 'Intelligence' },
  { key: 'ops', label: 'Operations' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { getActiveSubreddit, subreddits, setActiveSubreddit } = useSubredditStore();
  const location = useLocation();
  const activeSubreddit = getActiveSubreddit();

  return (
    <motion.aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-white/[0.06] bg-surface-950/95 backdrop-blur-xl"
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p className="font-bold text-sm text-foreground leading-none">VibeModerator</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">OS v1.0</p>
          </motion.div>
        )}
      </div>

      {/* Subreddit Switcher */}
      {!sidebarCollapsed && subreddits.length > 0 && (
        <div className="px-3 pt-3">
          <select
            className="w-full input-base text-xs py-1.5"
            value={activeSubreddit?.id || ''}
            onChange={(e) => setActiveSubreddit(e.target.value)}
          >
            {subreddits.map((s) => (
              <option key={s.id} value={s.id}>
                r/{s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((i) => i.section === section.key);
          return (
            <div key={section.key} className="mb-4">
              {!sidebarCollapsed && (
                <p className="section-label px-2 mb-1.5">{section.label}</p>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'nav-item',
                      isActive && 'nav-item-active',
                      sidebarCollapsed && 'justify-center px-0'
                    )
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                  {!sidebarCollapsed && item.badge === 'raid' && (
                    <span className="status-dot status-dot-high animate-pulse" />
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Health indicator */}
      {!sidebarCollapsed && activeSubreddit && (
        <div className="px-3 pb-3 border-t border-white/[0.06] pt-3">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-muted-foreground">Community Health</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-500"
                  style={{ width: `${(activeSubreddit.healthScore || 0.7) * 100}%` }}
                />
              </div>
              <span className="text-xs text-foreground font-medium">
                {Math.round((activeSubreddit.healthScore || 0.7) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
