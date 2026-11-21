import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Percent,
  Gauge,
  Calendar
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

export default function AnalyticsPage() {
  const { activeWorkspaceId } = useAppStore();
  const [timeRange, setTimeRange] = useState('all');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', activeWorkspaceId, { timeRange }],
    queryFn: () => api.getAnalytics(activeWorkspaceId, { timeRange }),
    enabled: !!activeWorkspaceId
  });

  const overview = analyticsData?.data?.overview || {
    totalRequests: 0,
    successfulRequests: 0,
    httpErrors: 0,
    transportErrors: 0,
    successRate: 0,
    averageResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    medianResponseTime: 0,
    p95ResponseTime: 0,
    testPassRate: 0,
    totalPassedAssertions: 0,
    totalFailedAssertions: 0
  };

  const statusDist = analyticsData?.data?.statusDistribution || [];
  const methodDist = analyticsData?.data?.methodDistribution || [];
  const topEndpoints = analyticsData?.data?.topEndpoints || [];
  const timeline = analyticsData?.data?.timeline || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#26C6DA]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">API Analytics & Performance</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Real SQLite-backed telemetry, response latency percentiles (Median, P95), and status breakdown.
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center space-x-1 bg-bg-secondary p-1 rounded-lg border border-bg-border text-xs">
          {[
            { id: 'all', label: 'All Time' },
            { id: '30d', label: '30 Days' },
            { id: '7d', label: '7 Days' },
            { id: '24h', label: '24 Hours' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id)}
              className={`px-3 py-1 rounded-md transition-colors ${
                timeRange === t.id
                  ? 'bg-bg-primary text-[#7C6CFF] font-semibold shadow-sm'
                  : 'text-muted hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Latency Percentiles Card Deck */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <span className="text-[11px] font-medium text-muted">Min Latency</span>
          <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
            {overview.minResponseTime} <span className="text-xs font-normal text-muted">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">Fastest observed</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <span className="text-[11px] font-medium text-muted">Average Latency</span>
          <div className="text-xl font-bold font-mono mt-1 text-[#26C6DA]">
            {overview.averageResponseTime} <span className="text-xs font-normal text-muted">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">Mean duration</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <span className="text-[11px] font-medium text-muted">Median Latency (p50)</span>
          <div className="text-xl font-bold font-mono mt-1 text-sky-400">
            {overview.medianResponseTime} <span className="text-xs font-normal text-muted">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">50th percentile</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <span className="text-[11px] font-medium text-muted">95th Percentile (p95)</span>
          <div className="text-xl font-bold font-mono mt-1 text-amber-400">
            {overview.p95ResponseTime} <span className="text-xs font-normal text-muted">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">Tail latency threshold</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <span className="text-[11px] font-medium text-muted">Max Latency</span>
          <div className="text-xl font-bold font-mono mt-1 text-rose-400">
            {overview.maxResponseTime} <span className="text-xs font-normal text-muted">ms</span>
          </div>
          <span className="text-[10px] text-muted font-mono">Slowest observed</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Timeline Chart */}
        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Latency Trend Over Time</h3>
          <p className="text-[11px] text-muted mb-4">Average response duration in milliseconds</p>

          <div className="h-60 w-full">
            {timeline.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted">No data points logged</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                  <XAxis dataKey="timeBucket" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--bg-border)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgLatency"
                    name="Avg Latency (ms)"
                    stroke="#26C6DA"
                    fill="#26C6DA"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* HTTP Method Distribution */}
        <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">HTTP Method Breakdown</h3>
          <p className="text-[11px] text-muted mb-4">Total requests grouped by HTTP verb</p>

          <div className="h-60 w-full">
            {methodDist.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted">No method data recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />
                  <XAxis dataKey="method" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--bg-border)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="count" name="Total Calls" radius={[4, 4, 0, 0]}>
                    {methodDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={METHOD_COLORS[entry.method] || '#7C6CFF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Endpoints Table */}
      <div className="p-4 rounded-xl bg-bg-primary border border-bg-border">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Most Frequently Executed Endpoints</h3>
        <p className="text-[11px] text-muted mb-3">Ranked by invocation frequency</p>

        {topEndpoints.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">No endpoint calls recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Target URL</th>
                  <th className="py-2.5 px-4">Total Executions</th>
                  <th className="py-2.5 px-4">Average Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {topEndpoints.map((ep, i) => (
                  <tr key={i} className="hover:bg-bg-secondary/40">
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold badge-${ep.method.toLowerCase()}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-primary)]">{ep.sanitized_url}</td>
                    <td className="py-2.5 px-4 font-bold">{ep.count}</td>
                    <td className="py-2.5 px-4 text-muted">{ep.avg_time}ms</td>
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
