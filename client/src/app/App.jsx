import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../stores/workspaceStore.js';
import { api } from '../services/api.js';

import AppShell from '../components/layout/AppShell.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import ApiClientPage from '../features/api-client/ApiClientPage.jsx';
import MockServerPage from '../features/mock-server/MockServerPage.jsx';
import DemoApiPage from '../features/demo-api/DemoApiPage.jsx';
import CollectionsPage from '../features/collections/CollectionsPage.jsx';
import EnvironmentsPage from '../features/environments/EnvironmentsPage.jsx';
import TestSuitesPage from '../features/test-suites/TestSuitesPage.jsx';
import CollectionRunnerPage from '../features/runner/CollectionRunnerPage.jsx';
import HistoryPage from '../features/history/HistoryPage.jsx';
import AnalyticsPage from '../features/analytics/AnalyticsPage.jsx';
import DocumentationPage from '../features/documentation/DocumentationPage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';

export default function App() {
  const { setWorkspaces, setEnvironments, setBackendConnected, activeWorkspaceId } = useAppStore();

  // Periodic health check
  const { data: healthData, isError: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 3000
  });

  useEffect(() => {
    setBackendConnected(!healthError && !!healthData);
  }, [healthData, healthError, setBackendConnected]);

  // Load workspaces
  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.getWorkspaces
  });

  useEffect(() => {
    if (workspacesData?.data) {
      setWorkspaces(workspacesData.data);
    }
  }, [workspacesData, setWorkspaces]);

  // Load environments for active workspace
  const { data: envsData } = useQuery({
    queryKey: ['environments', activeWorkspaceId],
    queryFn: () => api.getEnvironments(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  useEffect(() => {
    if (envsData?.data) {
      setEnvironments(envsData.data);
    }
  }, [envsData, setEnvironments]);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/client" element={<ApiClientPage />} />
        <Route path="/mock-server" element={<MockServerPage />} />
        <Route path="/demo-api" element={<DemoApiPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/environments" element={<EnvironmentsPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/runner" element={<CollectionRunnerPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
