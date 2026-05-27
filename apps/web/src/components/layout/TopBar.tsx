// ============================================================
// VibeModerator OS — Top Bar
// ============================================================

import { Search, Bell, MessageSquare, User } from 'lucide-react';
import { useUIStore, useAuthStore, useCopilotStore } from '../../store';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Subreddit overview and key metrics' },
  '/rules': { title: 'Rules Engine', subtitle: 'AI-powered natural language moderation rules' },
  '/workflows': { title: 'Workflow Builder', subtitle: 'Visual automation workflows' },
  '/simulator': { title: 'Rule Simulator', subtitle: 'Test moderation rules before deployment' },
  '/analytics': { title: 'Analytics', subtitle: 'Community DNA and moderation insights' },
  '/modmind': { title: 'ModMind', subtitle: 'Predictive toxicity AI and early warning system' },
  '/brigade': { title: 'BrigadeSentry', subtitle: 'Real-time anti-brigading defense system' },
  '/shadow': { title: 'ShadowScope', subtitle: 'Ban evasion intelligence and account analysis' },
  '/queue': { title: 'Mod Queue', subtitle: 'Prioritized moderation action queue' },
  '/hub': { title: 'Mod Hub', subtitle: 'Team operations and task coordination' },
  '/marketplace': { title: 'Rule Marketplace', subtitle: 'Community rule templates and workflows' },
  '/settings': { title: 'Settings', subtitle: 'Subreddit configuration and preferences' },
};

export function TopBar() {
  const location = useLocation();
  const { setCommandPalette } = useUIStore();
  const { user } = useAuthStore();
  const { setOpen, isOpen } = useCopilotStore();

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'VibeModerator OS', subtitle: '' };

  return (
    <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
      {/* Page title */}
      <div>
        <h1 className="text-sm font-semibold text-foreground">{pageInfo.title}</h1>
        <p className="text-xs text-muted-foreground">{pageInfo.subtitle}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setCommandPalette(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground text-xs hover:text-foreground hover:bg-white/8 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Search...</span>
          <kbd className="hidden sm:block text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">K</kbd>
        </button>

        {/* ModGPT Toggle */}
        <button
          onClick={() => setOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isOpen
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:block">ModGPT</span>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* User avatar */}
        <button className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-semibold">
          {user?.username?.[0]?.toUpperCase() || 'M'}
        </button>
      </div>
    </header>
  );
}
