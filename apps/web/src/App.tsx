// ============================================================
// VibeModerator OS — App Root
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RulesPage } from './pages/RulesPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModMindPage } from './pages/ModMindPage';
import { BrigadePage } from './pages/BrigadePage';
import { ShadowPage } from './pages/ShadowPage';
import { QueuePage } from './pages/QueuePage';
import { HubPage } from './pages/HubPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="modmind" element={<ModMindPage />} />
            <Route path="brigade" element={<BrigadePage />} />
            <Route path="shadow" element={<ShadowPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="hub" element={<HubPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d0f1a',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#e2e8f0',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
