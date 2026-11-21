import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  PlaySquare,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Sliders,
  FolderGit2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function CollectionRunnerPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, activeEnvironmentId } = useAppStore();

  const [selectedColId, setSelectedColId] = useState(location.state?.collectionId || '');
  const [iterations, setIterations] = useState(1);
  const [runSummary, setRunSummary] = useState(null);

  // Queries
  const { data: collectionsData } = useQuery({
    queryKey: ['collections', activeWorkspaceId],
    queryFn: () => api.getCollections(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const collections = collectionsData?.data || [];

  React.useEffect(() => {
    if (!selectedColId && collections.length > 0) {
      setSelectedColId(collections[0].id);
    }
  }, [collections, selectedColId]);

  // Run Collection Mutation
  const runMutation = useMutation({
    mutationFn: () =>
      api.runCollection(selectedColId, {
        workspaceId: activeWorkspaceId,
        environmentId: activeEnvironmentId,
        iterations
      }),
    onSuccess: (data) => {
      setRunSummary(data.data);
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      alert(`Collection execution failed: ${err.message}`);
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <PlaySquare className="w-5 h-5 text-[#7C6CFF]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Collection Runner</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Execute a series of saved requests sequentially with bounded iterations and aggregated assertion metrics.
          </p>
        </div>
      </div>

      {/* Runner Setup Card */}
      <div className="p-5 rounded-xl bg-bg-primary border border-bg-border space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Execution Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-muted font-medium">Select Target Collection</label>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.request_count || 0} reqs)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-muted font-medium">Iterations (Bounded: 1 to 3)</label>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-2 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
            >
              <option value={1}>1 Iteration</option>
              <option value={2}>2 Iterations</option>
              <option value={3}>3 Iterations</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => runMutation.mutate()}
              disabled={!selectedColId || runMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded bg-[#7C6CFF] hover:bg-[#6856f6] disabled:opacity-50 text-white font-semibold shadow-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>{runMutation.isPending ? 'Executing Sequential Requests...' : 'Start Collection Run'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Run Summary Results */}
      {runSummary && (
        <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-bg-border gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Collection Run Summary</h3>
              <span className="text-[11px] text-muted font-mono">Run ID: {runSummary.runId}</span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-status-success font-semibold">Success: {runSummary.successfulRequests}</span>
              <span className="text-amber-400 font-semibold">Non-2xx: {runSummary.nonSuccessRequests}</span>
              <span className="text-status-error font-semibold">Transport Errors: {runSummary.transportErrors}</span>
              <span className="text-muted">Total Time: {runSummary.totalDurationMs}ms</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Iter</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Request Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Assertions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {runSummary.results.map((r, i) => (
                  <tr key={i} className="hover:bg-bg-secondary/40">
                    <td className="py-2.5 px-3 text-muted">#{r.iteration}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold badge-${r.method?.toLowerCase()}`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-[var(--text-primary)]">{r.requestName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          r.status >= 200 && r.status < 300 ? 'text-status-success font-bold' : 'text-status-error font-bold'
                        }
                      >
                        {r.status || 'ERR'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted">{Number(r.durationMs).toFixed(1)}ms</td>
                    <td className="py-2.5 px-3 text-muted">{r.sizeBytes} B</td>
                    <td className="py-2.5 px-3">
                      {r.assertions?.total > 0 ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.assertions.failed === 0
                              ? 'bg-status-success/10 text-status-success'
                              : 'bg-status-error/10 text-status-error'
                          }`}
                        >
                          {r.assertions.passed}/{r.assertions.total} passed
                        </span>
                      ) : (
                        <span className="text-muted text-[10px] font-sans">No tests</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
