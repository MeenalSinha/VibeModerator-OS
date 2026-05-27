// ============================================================
// VibeModerator OS — API Client
// ============================================================

import axios from 'axios';
import type {
  ApiResponse,
  ModerationRule,
  Workflow,
  ModQueueItem,
  RaidEvent,
  SuspiciousAccount,
  SubredditAnalytics,
  MarketplaceTemplate,
  ModTask,
  SimulationInput,
  SimulationOutput,
  CopilotMessage,
  Subreddit,
} from '@vibemod/shared';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token injection
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vibemod_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response unwrapper
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vibemod_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: (username: string) =>
    apiClient.post<ApiResponse<{ token: string; user: { id: string; redditUsername: string } }>>('/auth/login', { username }),
  me: () => apiClient.get<ApiResponse<{ authenticated: boolean }>>('/auth/me'),
};

// ============================================================
// Subreddits
// ============================================================
export const subredditsApi = {
  list: () => apiClient.get<ApiResponse<Subreddit[]>>('/subreddits'),
  get: (id: string) => apiClient.get<ApiResponse<Subreddit>>(`/subreddits/${id}`),
  updateSettings: (id: string, settings: Partial<Subreddit>) =>
    apiClient.patch<ApiResponse<Subreddit>>(`/subreddits/${id}/settings`, settings),
};

// ============================================================
// Rules
// ============================================================
export const rulesApi = {
  list: (subredditId: string, params?: { status?: string; limit?: number }) =>
    apiClient.get<ApiResponse<{ rules: ModerationRule[]; total: number }>>(`/rules/${subredditId}`, { params }),
  parse: (subredditId: string, naturalLanguage: string, context?: { name: string }) =>
    apiClient.post<ApiResponse<Partial<ModerationRule>>>(`/rules/${subredditId}/parse`, { naturalLanguage, subredditContext: context }),
  create: (subredditId: string, data: Partial<ModerationRule>) =>
    apiClient.post<ApiResponse<ModerationRule>>(`/rules/${subredditId}`, data),
  update: (subredditId: string, ruleId: string, data: Partial<ModerationRule>) =>
    apiClient.patch<ApiResponse<ModerationRule>>(`/rules/${subredditId}/${ruleId}`, data),
  delete: (subredditId: string, ruleId: string) =>
    apiClient.delete<ApiResponse<{ archived: boolean }>>(`/rules/${subredditId}/${ruleId}`),
  optimize: (subredditId: string, ruleId: string) =>
    apiClient.post<ApiResponse<{ suggestions: string[] }>>(`/rules/${subredditId}/${ruleId}/optimize`),
};

// ============================================================
// Workflows
// ============================================================
export const workflowsApi = {
  list: (subredditId: string) => apiClient.get<ApiResponse<Workflow[]>>(`/workflows/${subredditId}`),
  create: (subredditId: string, data: Partial<Workflow>) =>
    apiClient.post<ApiResponse<Workflow>>(`/workflows/${subredditId}`, data),
  update: (subredditId: string, id: string, data: Partial<Workflow>) =>
    apiClient.patch<ApiResponse<Workflow>>(`/workflows/${subredditId}/${id}`, data),
  delete: (subredditId: string, id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/workflows/${subredditId}/${id}`),
};

// ============================================================
// Simulation
// ============================================================
export const simulateApi = {
  run: (subredditId: string, input: SimulationInput) =>
    apiClient.post<ApiResponse<SimulationOutput>>('/simulate', { subredditId, input }),
  generateEdgeCases: (subredditId: string, count?: number) =>
    apiClient.post<ApiResponse<SimulationInput[]>>('/simulate/edge-cases', { subredditId, count }),
  analyzeToxicity: (content: string, contentType: 'post' | 'comment') =>
    apiClient.post<ApiResponse<{ score: number; level: string; reasoning: string }>>('/simulate/toxicity', { content, contentType }),
};

// ============================================================
// Analytics
// ============================================================
export const analyticsApi = {
  get: (subredditId: string, period?: string) =>
    apiClient.get<ApiResponse<{ report: SubredditAnalytics; eventSummary: Record<string, number>; queueSummary: Record<string, number> }>>(`/analytics/${subredditId}`, { params: { period } }),
  realtime: (subredditId: string) =>
    apiClient.get<ApiResponse<{ recentEvents: number; pendingQueue: number; raidActive: boolean; raidSeverity: string | null }>>(`/analytics/${subredditId}/realtime`),
};

// ============================================================
// Copilot
// ============================================================
export const copilotApi = {
  chat: (message: string, sessionId?: string, subredditId?: string, context?: Record<string, string>) =>
    apiClient.post<ApiResponse<{ sessionId: string; message: CopilotMessage; suggestedActions: unknown[]; followUpQuestions: string[] }>>('/copilot/chat', { message, sessionId, subredditId, context }),
  sessions: () => apiClient.get<ApiResponse<{ id: string; updatedAt: string }[]>>('/copilot/sessions'),
  summarizeQueue: (subredditId: string) =>
    apiClient.post<ApiResponse<{ summary: string; itemCount: number }>>('/copilot/summarize-queue', { subredditId }),
  draftModmail: (originalMessage: string, situation: string, tone: string) =>
    apiClient.post<ApiResponse<{ subject: string; body: string }>>('/copilot/draft-modmail', { originalMessage, situation, tone }),
  generateAutomod: (description: string) =>
    apiClient.post<ApiResponse<{ yaml: string }>>('/copilot/generate-automod', { description }),
};

// ============================================================
// Brigade
// ============================================================
export const brigadeApi = {
  events: (subredditId: string) => apiClient.get<ApiResponse<RaidEvent[]>>(`/brigade/${subredditId}/events`),
  status: (subredditId: string) => apiClient.get<ApiResponse<{ isActive: boolean; event: RaidEvent | null }>>(`/brigade/${subredditId}/status`),
  resolve: (subredditId: string, eventId: string) =>
    apiClient.post<ApiResponse<RaidEvent>>(`/brigade/${subredditId}/resolve/${eventId}`),
};

// ============================================================
// ShadowScope
// ============================================================
export const shadowApi = {
  suspects: (subredditId: string) => apiClient.get<ApiResponse<SuspiciousAccount[]>>(`/shadow/${subredditId}/suspects`),
  updateSuspect: (subredditId: string, id: string, data: Partial<SuspiciousAccount>) =>
    apiClient.patch<ApiResponse<SuspiciousAccount>>(`/shadow/${subredditId}/suspects/${id}`, data),
};

// ============================================================
// Mod Queue
// ============================================================
export const queueApi = {
  list: (subredditId: string, params?: { status?: string; priority?: string; limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<{ items: ModQueueItem[]; total: number }>>(`/queue/${subredditId}`, { params }),
  update: (subredditId: string, itemId: string, data: Partial<ModQueueItem>) =>
    apiClient.patch<ApiResponse<ModQueueItem>>(`/queue/${subredditId}/${itemId}`, data),
  bulkAction: (subredditId: string, itemIds: string[], action: string) =>
    apiClient.post<ApiResponse<{ updated: number }>>(`/queue/${subredditId}/bulk-action`, { itemIds, action }),
};

// ============================================================
// Hub (Mod Ops)
// ============================================================
export const hubApi = {
  tasks: (subredditId: string, params?: { status?: string }) =>
    apiClient.get<ApiResponse<ModTask[]>>(`/hub/${subredditId}/tasks`, { params }),
  createTask: (subredditId: string, data: Partial<ModTask>) =>
    apiClient.post<ApiResponse<ModTask>>(`/hub/${subredditId}/tasks`, data),
  updateTask: (subredditId: string, taskId: string, data: Partial<ModTask>) =>
    apiClient.patch<ApiResponse<ModTask>>(`/hub/${subredditId}/tasks/${taskId}`, data),
};

// ============================================================
// Marketplace
// ============================================================
export const marketplaceApi = {
  list: (params?: { category?: string; type?: string; search?: string; limit?: number }) =>
    apiClient.get<ApiResponse<MarketplaceTemplate[]>>('/marketplace', { params }),
  get: (id: string) => apiClient.get<ApiResponse<MarketplaceTemplate>>(`/marketplace/${id}`),
  install: (id: string, subredditId: string) =>
    apiClient.post<ApiResponse<{ installed: boolean }>>(`/marketplace/${id}/install`, { subredditId }),
};

// ============================================================
// ModMind
// ============================================================
export const modmindApi = {
  dashboard: (subredditId: string) =>
    apiClient.get<ApiResponse<{ raidEvents: unknown[]; suspects: unknown[]; topToxic: unknown[] }>>(`/modmind/${subredditId}/dashboard`),
  toxicityTimeline: (subredditId: string) =>
    apiClient.get<ApiResponse<{ timeline: Array<{ time: string; score: number; threshold: number; eventCount: number }> }>>(`/modmind/${subredditId}/toxicity-timeline`),
  threadRisks: (subredditId: string) =>
    apiClient.get<ApiResponse<{ threads: Array<{ thread: string; score: number; trajectory: string; comments: number; contentId: string; priority: string }> }>>(`/modmind/${subredditId}/thread-risks`),
  intervene: (subredditId: string, contentId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/modmind/${subredditId}/intervene/${contentId}`),
};

