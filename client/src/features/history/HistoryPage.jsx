import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Send
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, createTab } = useAppStore();

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [statusCategory, setStatusCategory] = useState('');
  const [page, setPage] = useState(1);

  // Query
  const { data: historyResponse, isLoading } = useQuery({
    queryKey: ['history', activeWorkspaceId, { search, method, statusCategory, page }],
    queryFn: () =>
      api.getHistory(activeWorkspaceId, {
        search,
        method,
        statusCategory,
        page,
        limit: 25
      }),
    enabled: !!activeWorkspaceId
  });

  const historyItems = historyResponse?.data || [];
  const pagination = historyResponse?.pagination || { total: 0, totalPages: 1, page: 1 };

  // Mutations
  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.deleteHistoryItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] })
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.clearHistory(activeWorkspaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] })
  });

  const handleOpenInClient = (item) => {
    createTab({
      requestId: item.request_id || null,
      name: `Replay: ${item.method} ${item.sanitized_url}`,
      method: item.method,
      urlTemplate: item.sanitized_url
    });
    navigate('/client');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#7C6CFF]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Request Execution History</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Searchable, audit-safe log of outbound HTTP requests. Secret tokens and credentials are automatically redacted.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Clear all execution history for this workspace? This action is permanent.')) {
              clearAllMutation.mutate();
            }
          }}
          disabled={historyItems.length === 0}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-status-error hover:border-status-error/40 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Workspace History</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-bg-primary border border-bg-border rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
          />
        </div>

        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          className="bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <select
          value={statusCategory}
          onChange={(e) => {
            setStatusCategory(e.target.value);
            setPage(1);
          }}
          className="bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
        >
          <option value="">All Statuses</option>
          <option value="2xx">2xx Success</option>
          <option value="3xx">3xx Redirect</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
          <option value="error">Transport Failure</option>
        </select>
      </div>

      {/* History Table */}
      <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
        {historyItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">No request history found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Sanitized URL</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Outcome</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold badge-${item.method.toLowerCase()}`}>
                        {item.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-sm truncate text-[var(--text-primary)]" title={item.sanitized_url}>
                      {item.sanitized_url}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {item.status_code ? (
                        <span className={item.status_code >= 200 && item.status_code < 300 ? 'text-status-success' : 'text-status-error'}>
                          {item.status_code}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-muted">{Number(item.response_time_ms).toFixed(1)}ms</td>
                    <td className="py-2.5 px-4 text-muted">{item.response_size_bytes} B</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          item.execution_status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.execution_status === 'http_error'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {item.execution_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-muted text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenInClient(item)}
                        className="p-1 rounded text-muted hover:text-[#7C6CFF] hover:bg-bg-elevated"
                        title="Replay in API Client"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        className="p-1 text-muted hover:text-status-error"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-bg-border bg-bg-secondary flex items-center justify-between text-xs text-muted font-mono">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded bg-bg-primary border border-bg-border disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded bg-bg-primary border border-bg-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
