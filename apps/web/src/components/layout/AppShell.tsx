// ============================================================
// VibeModerator OS — App Shell Layout
// ============================================================

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CopilotPanel } from '../copilot/CopilotPanel';
import { CommandPalette } from '../ui/CommandPalette';
import { useUIStore, useSubredditStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { subredditsApi } from '../../lib/api';

export function AppShell() {
  const { sidebarCollapsed } = useUIStore();
  const { setSubreddits, subreddits } = useSubredditStore();

  // Load subreddits from backend on mount (once)
  useEffect(() => {
    if (subreddits.length === 0) {
      subredditsApi.list().then((res) => {
        if (res.data?.data && res.data.data.length > 0) {
          setSubreddits(res.data.data);
        }
      }).catch(() => {
        // Silently ignore — user will see empty state
      });
    }
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '240px' }}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 max-w-[1600px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Copilot panel */}
      <CopilotPanel />

      {/* Command palette */}
      <CommandPalette />
    </div>
  );
}
