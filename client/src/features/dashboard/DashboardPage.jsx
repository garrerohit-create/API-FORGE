import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Boxes,
  Database,
  FolderPlus,
  PlayCircle,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

const STATUS_COLORS = {
  '2xx Success': '#22C55E',
  '3xx Redirection': '#3B82F6',
  '4xx Client Error': '#F59E0B',
  '5xx Server Error': '#EF4444',
  'Transport / Network Error': '#94A3B8'
};

const METHOD_COLORS = {
  GET: '#22C55E',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#A855F7',
  DELETE: '#EF4444'
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { activeWorkspaceId, createTab } = useAppStore();

  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['analytics', activeWorkspaceId],
    queryFn: () => api.getAnalytics(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const { data: historyData } = useQuery({
    queryKey: ['history', activeWorkspaceId, { limit: 6 }],
    queryFn: () => api.getHistory(activeWorkspaceId, { limit: 6 }),
    enabled: !!activeWorkspaceId
  });

  const overview = analyticsData?.data?.overview || {
    totalRequests: 0,
    successfulRequests: 0,
    httpErrors: 0,
    transportErrors: 0,
    successRate: 0,
    averageResponseTime: 0,
    activeMockEndpoints: 0,
    savedCollections: 0,
    testPassRate: 0
  };

  const statusDist = analyticsData?.data?.statusDistribution || [];
  const methodDist = analyticsData?.data?.methodDistribution || [];
  const timeline = analyticsData?.data?.timeline || [];
  const recentHistory = historyData?.data || [];

  const handleQuickNewRequest = () => {
    createTab({ name: 'Untitled Request' });
    navigate('/client');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-bg-primary via-bg-secondary to-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded bg-[#7C6CFF]/20 text-[#7C6CFF] border border-[#7C6CFF]/30">
              API FORGE v1.0
            </span>
            <span className="text-xs text-muted">Integrated Testing Platform</span>
          </div>
          <h2 className="text-xl font-bold mt-1 tracking-tight text-[var(--text-primary)]">
            Engineering Dashboard
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time telemetry, mock activity, assertion pass rates, and request metrics.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleQuickNewRequest}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
          <button
            onClick={() => navigate('/mock-server')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-border border border-bg-border text-xs text-[var(--text-primary)] transition-colors"
          >
            <Boxes className="w-3.5 h-3.5 text-[#26C6DA]" />
            <span>Mock API</span>
          </button>
          <button
            onClick={() => navigate('/demo-api')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-border border border-bg-border text-xs text-[var(--text-primary)] transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo CRUD API</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">Total Requests</span>
            <Activity className="w-4 h-4 text-[#7C6CFF]" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-[var(--text-primary)]">
            {overview.totalRequests}
          </div>
          <span className="text-[10px] text-muted font-mono">SQLite execution log</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">HTTP Success</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
            {overview.successfulRequests}
          </div>
          <span className="text-[10px] text-muted font-mono">{overview.successRate}% pass rate</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">HTTP Non-2xx</span>
            <XCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-amber-400">
            {overview.httpErrors}
          </div>
          <span className="text-[10px] text-muted font-mono">Status 4xx / 5xx</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">Avg Latency</span>
            <Clock className="w-4 h-4 text-[#26C6DA]" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-[var(--text-primary)]">
            {overview.averageResponseTime} <span className="text-xs text-muted font-normal">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">Monotonic timing</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">Collections</span>
            <FolderPlus className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-[var(--text-primary)]">
            {overview.savedCollections}
          </div>
          <span className="text-[10px] text-muted font-mono">In active workspace</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">Mock Routes</span>
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-[var(--text-primary)]">
            {overview.activeMockEndpoints}
          </div>
          <span className="text-[10px] text-muted font-mono">Active endpoints</span>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">Test Pass Rate</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
            {overview.testPassRate}%
          </div>
          <span className="text-[10px] text-muted font-mono">Declarative engine</span>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency & Requests Timeline */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activity Timeline</h3>
              <p className="text-[11px] text-muted">Request volume and average response time over time</p>
            </div>
            <span className="text-[11px] font-mono text-[#7C6CFF]">Hourly Buckets</span>
          </div>

          <div className="h-56 w-full">
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted">
                <Activity className="w-8 h-8 text-muted mb-2 opacity-40" />
                <span>No execution activity recorded yet.</span>
                <span className="text-[11px] text-muted/70 mt-1">Execute requests in API Client to generate live telemetry.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C6CFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7C6CFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                  <XAxis dataKey="timeBucket" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--bg-border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgLatency"
                    name="Avg Latency (ms)"
                    stroke="#7C6CFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* HTTP Status Breakdown */}
        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Status Breakdown</h3>
              <p className="text-[11px] text-muted">Distribution by response category</p>
            </div>
          </div>

          <div className="h-56 w-full">
            {statusDist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted">
                <span>Zero executions logged.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDist} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis dataKey="category" type="category" stroke="var(--text-muted)" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--bg-border)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.category] || '#7C6CFF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Execution History</h3>
            <p className="text-[11px] text-muted">Latest HTTP requests executed by the backend engine</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center space-x-1 text-xs text-[#7C6CFF] hover:underline"
          >
            <span>View All History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">
            No execution history found. Go to the API Client to execute your first request!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">URL</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Latency</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3">Outcome</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {recentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-secondary/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold badge-${item.method.toLowerCase()}`}>
                        {item.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-[var(--text-primary)]" title={item.sanitized_url}>
                      {item.sanitized_url}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.status_code ? (
                        <span
                          className={
                            item.status_code >= 200 && item.status_code < 300
                              ? 'text-status-success font-semibold'
                              : 'text-status-error font-semibold'
                          }
                        >
                          {item.status_code}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                      {Number(item.response_time_ms).toFixed(1)}ms
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                      {item.response_size_bytes} B
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
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
                    <td className="py-2.5 px-3 text-muted text-[11px]">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
