// ============================================================
// VibeModerator OS — Global State Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Subreddit, ModerationRule, ModQueueItem, CopilotMessage } from '@vibemod/shared';

// ============================================================
// Auth Store
// ============================================================
interface AuthState {
  user: { id: string; username: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: { id: string; username: string }, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('vibemod_token', token);
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('vibemod_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'vibemod-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

// ============================================================
// Subreddit Store
// ============================================================
interface SubredditState {
  subreddits: Subreddit[];
  activeSubredditId: string | null;
  setSubreddits: (subreddits: Subreddit[]) => void;
  setActiveSubreddit: (id: string) => void;
  getActiveSubreddit: () => Subreddit | undefined;
}

export const useSubredditStore = create<SubredditState>()(
  persist(
    (set, get) => ({
      subreddits: [],
      activeSubredditId: null,
      setSubreddits: (subreddits) => {
        set({ subreddits });
        if (!get().activeSubredditId && subreddits.length > 0) {
          set({ activeSubredditId: subreddits[0]!.id });
        }
      },
      setActiveSubreddit: (id) => set({ activeSubredditId: id }),
      getActiveSubreddit: () => {
        const { subreddits, activeSubredditId } = get();
        return subreddits.find((s) => s.id === activeSubredditId);
      },
    }),
    { name: 'vibemod-subreddit', partialize: (s) => ({ activeSubredditId: s.activeSubredditId }) }
  )
);

// ============================================================
// UI Store
// ============================================================
interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
  toggleSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
  setModal: (modal: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  activeModal: null,
  notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
  setModal: (modal) => set({ activeModal: modal }),
  addNotification: (notification) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [{ ...notification, id, timestamp: new Date() }, ...s.notifications.slice(0, 9)],
    }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 5000);
  },
  dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));

// ============================================================
// Copilot Store
// ============================================================
interface CopilotState {
  isOpen: boolean;
  sessionId: string | null;
  messages: CopilotMessage[];
  isLoading: boolean;
  setOpen: (open: boolean) => void;
  setSession: (sessionId: string) => void;
  addMessage: (message: CopilotMessage) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isLoading: false,
  setOpen: (open) => set({ isOpen: open }),
  setSession: (sessionId) => set({ sessionId }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ sessionId: null, messages: [] }),
}));

// ============================================================
// Rule Builder Store
// ============================================================
interface RuleBuilderState {
  naturalLanguage: string;
  parsedPreview: Partial<ModerationRule> | null;
  isParsing: boolean;
  setNaturalLanguage: (text: string) => void;
  setParsedPreview: (rule: Partial<ModerationRule> | null) => void;
  setIsParsing: (parsing: boolean) => void;
  reset: () => void;
}

export const useRuleBuilderStore = create<RuleBuilderState>((set) => ({
  naturalLanguage: '',
  parsedPreview: null,
  isParsing: false,
  setNaturalLanguage: (naturalLanguage) => set({ naturalLanguage }),
  setParsedPreview: (parsedPreview) => set({ parsedPreview }),
  setIsParsing: (isParsing) => set({ isParsing }),
  reset: () => set({ naturalLanguage: '', parsedPreview: null, isParsing: false }),
}));

// ============================================================
// Queue Store
// ============================================================
interface QueueState {
  items: ModQueueItem[];
  total: number;
  filters: { status: string; priority: string | null };
  setItems: (items: ModQueueItem[], total: number) => void;
  setFilters: (filters: Partial<QueueState['filters']>) => void;
  updateItem: (id: string, update: Partial<ModQueueItem>) => void;
  removeItem: (id: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  items: [],
  total: 0,
  filters: { status: 'pending', priority: null },
  setItems: (items, total) => set({ items, total }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  updateItem: (id, update) =>
    set((s) => ({ items: s.items.map((item) => (item.id === id ? { ...item, ...update } : item)) })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id), total: s.total - 1 })),
}));
