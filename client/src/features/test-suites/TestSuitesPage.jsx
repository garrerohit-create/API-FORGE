import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  Clock,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListChecks,
  X
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function TestSuitesPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId, activeEnvironmentId } = useAppStore();

  const [activeSuiteId, setActiveSuiteId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [suiteName, setSuiteName] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');
  const [lastRunResult, setLastRunResult] = useState(null);

  // Queries
  const { data: suitesResponse, isLoading } = useQuery({
    queryKey: ['testSuites', activeWorkspaceId],
    queryFn: () => api.getTestSuites(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const testSuites = suitesResponse?.data || [];

  // Mutations
  const createSuiteMutation = useMutation({
    mutationFn: (data) => api.createTestSuite(activeWorkspaceId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['testSuites'] });
      setIsCreateModalOpen(false);
      setSuiteName('');
      setSuiteDesc('');
      setActiveSuiteId(res.data.id);
    }
  });

  const runSuiteMutation = useMutation({
    mutationFn: (suiteId) => api.runTestSuite(suiteId, { environmentId: activeEnvironmentId }),
    onSuccess: (data) => {
      setLastRunResult(data.data);
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (err) => {
      alert(`Test suite execution failed: ${err.message}`);
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Automated Test Suites</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Declarative automated regression testing for API endpoints without arbitrary code execution.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Test Suite</span>
          </button>
        </div>
      </div>

      {/* Test Suites List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testSuites.map((suite) => (
          <div
            key={suite.id}
            onClick={() => setActiveSuiteId(suite.id)}
            className={`p-4 rounded-xl bg-bg-primary border transition-colors cursor-pointer space-y-3 ${
              activeSuiteId === suite.id ? 'border-[#7C6CFF] shadow-sm' : 'border-bg-border hover:border-bg-border/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{suite.name}</h3>
                <p className="text-xs text-muted mt-0.5">{suite.description || 'No description provided'}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-muted border border-bg-border">
                {suite.request_count || 0} reqs
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                runSuiteMutation.mutate(suite.id);
              }}
              disabled={runSuiteMutation.isPending}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-[#7C6CFF]/15 hover:bg-[#7C6CFF]/25 border border-[#7C6CFF]/30 text-xs font-semibold text-[#7C6CFF] transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{runSuiteMutation.isPending ? 'Executing Tests...' : 'Run Test Suite'}</span>
            </button>
          </div>
        ))}

        {testSuites.length === 0 && (
          <div className="col-span-3 p-8 text-center rounded-xl bg-bg-primary border border-bg-border text-muted text-xs">
            No test suites created yet.
          </div>
        )}
      </div>

      {/* Execution Results Section */}
      {lastRunResult && (
        <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-bg-border gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                    lastRunResult.executionStatus === 'passed'
                      ? 'bg-status-success/15 text-status-success border border-status-success/30'
                      : 'bg-status-error/15 text-status-error border border-status-error/30'
                  }`}
                >
                  {lastRunResult.executionStatus}
                </span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Test Suite Run Results</h3>
              </div>
              <span className="text-[11px] text-muted font-mono">Run ID: {lastRunResult.runId}</span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-status-success font-semibold">Passed: {lastRunResult.passedAssertions}</span>
              <span className="text-status-error font-semibold">Failed: {lastRunResult.failedAssertions}</span>
              <span className="text-muted">Total: {lastRunResult.totalAssertions}</span>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-2">
            {lastRunResult.results.map((res, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-start space-x-3 ${
                  res.result_status === 'passed'
                    ? 'bg-status-success/5 border-status-success/20 text-status-success'
                    : 'bg-status-error/5 border-status-error/20 text-status-error'
                }`}
              >
                {res.result_status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{res.assertion_name_snapshot}</span>
                    <span className="text-[10px] uppercase font-mono font-bold">{res.result_status}</span>
                  </div>

                  {res.failure_message_sanitized && (
                    <div className="text-[11px] text-rose-300 font-mono">
                      {res.failure_message_sanitized}
                    </div>
                  )}

                  <div className="text-[10px] text-muted font-mono">
                    Expected: {res.expected_value_sanitized} | Received: {res.actual_value_sanitized}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-primary border border-bg-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Test Suite</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted font-medium">Suite Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core API Regression Suite"
                  value={suiteName}
                  onChange={(e) => setSuiteName(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Description</label>
                <textarea
                  rows={3}
                  placeholder="Suite objectives..."
                  value={suiteDesc}
                  onChange={(e) => setSuiteDesc(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-bg-border">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-bg-secondary text-xs text-muted hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => createSuiteMutation.mutate({ name: suiteName, description: suiteDesc })}
                disabled={!suiteName}
                className="px-4 py-1.5 rounded bg-[#7C6CFF] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                Create Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
