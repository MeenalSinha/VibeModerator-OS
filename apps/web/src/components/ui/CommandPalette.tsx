// ============================================================
// VibeModerator OS — Command Palette
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, Shield, GitBranch, FlaskConical,
  BarChart3, Brain, Siren, Eye, Inbox, Kanban, Store,
  Settings, Sparkles, X
} from 'lucide-react';
import { useUIStore, useCopilotStore } from '../../store';
import { clsx } from 'clsx';

const COMMANDS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', group: 'Navigation' },
  { label: 'Mod Queue', icon: Inbox, path: '/queue', group: 'Navigation' },
  { label: 'Rules Engine', icon: Shield, path: '/rules', group: 'Navigation' },
  { label: 'Workflow Builder', icon: GitBranch, path: '/workflows', group: 'Navigation' },
  { label: 'Rule Simulator', icon: FlaskConical, path: '/simulator', group: 'Navigation' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', group: 'Navigation' },
  { label: 'ModMind', icon: Brain, path: '/modmind', group: 'Navigation' },
  { label: 'BrigadeSentry', icon: Siren, path: '/brigade', group: 'Navigation' },
  { label: 'ShadowScope', icon: Eye, path: '/shadow', group: 'Navigation' },
  { label: 'Mod Hub', icon: Kanban, path: '/hub', group: 'Navigation' },
  { label: 'Marketplace', icon: Store, path: '/marketplace', group: 'Navigation' },
  { label: 'Settings', icon: Settings, path: '/settings', group: 'Navigation' },
  { label: 'Open ModGPT Copilot', icon: Sparkles, action: 'copilot', group: 'Actions' },
  { label: 'Create New Rule', icon: Shield, path: '/rules?new=1', group: 'Actions' },
  { label: 'Run Simulation', icon: FlaskConical, path: '/simulator', group: 'Actions' },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPalette } = useUIStore();
  const { setOpen } = useCopilotStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPalette(!commandPaletteOpen);
      }
      if (e.key === 'Escape') setCommandPalette(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPalette]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (cmd: (typeof COMMANDS)[0]) => {
    setCommandPalette(false);
    setQuery('');
    if (cmd.action === 'copilot') {
      setOpen(true);
    } else if (cmd.path) {
      navigate(cmd.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = filtered[selectedIndex];
      if (cmd) execute(cmd);
    }
  };

  const groups = [...new Set(filtered.map((c) => c.group))];

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setCommandPalette(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="glass-card border border-white/10 overflow-hidden shadow-2xl">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, actions, rules..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={() => setCommandPalette(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No results for "{query}"</p>
                ) : (
                  groups.map((group) => (
                    <div key={group} className="mb-2">
                      <p className="section-label px-3 py-1.5">{group}</p>
                      {filtered
                        .filter((c) => c.group === group)
                        .map((cmd, i) => {
                          const globalIndex = filtered.indexOf(cmd);
                          return (
                            <button
                              key={cmd.label}
                              onClick={() => execute(cmd)}
                              className={clsx(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                                globalIndex === selectedIndex
                                  ? 'bg-brand-500/15 text-foreground'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                              )}
                            >
                              <cmd.icon className="w-4 h-4 shrink-0" />
                              {cmd.label}
                            </button>
                          );
                        })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-muted-foreground">
                <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">Enter</kbd> select</span>
                <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
