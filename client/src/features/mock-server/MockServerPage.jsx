import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Play,
  Copy,
  Edit2,
  Trash2,
  Check,
  Clock,
  Layers,
  Code,
  AlertCircle,
  Activity,
  X
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function MockServerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, workspaces, createTab } = useAppStore();

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceSlug = currentWorkspace?.slug || 'demo';

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [expressSnippet, setExpressSnippet] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    method: 'GET',
    endpoint_path: '',
    response_status: 200,
    response_body: '{\n  "success": true,\n  "message": "Mock response"\n}',
    delay_ms: 0,
    is_enabled: true
  });

  // Queries
  const { data: endpointsData, isLoading } = useQuery({
    queryKey: ['mockEndpoints', activeWorkspaceId],
    queryFn: () => api.getMockEndpoints(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const { data: activityData } = useQuery({
    queryKey: ['mockActivity', activeWorkspaceId],
    queryFn: () => api.getMockActivity(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
    refetchInterval: 3000
  });

  const endpoints = endpointsData?.data || [];
  const activityLog = activityData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.createMockEndpoint(activeWorkspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateMockEndpoint(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteMockEndpoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
    }
  });

  const toggleEndpointMutation = useMutation({
    mutationFn: ({ id, is_enabled }) => api.updateMockEndpoint(id, { is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
    }
  });

  const toggleWorkspaceServiceMutation = useMutation({
    mutationFn: (mock_service_enabled) => api.updateWorkspace(activeWorkspaceId, { mock_service_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
  });

  const resetForm = () => {
    setEditingEndpoint(null);
    setFormData({
      name: '',
      description: '',
      method: 'GET',
      endpoint_path: '',
      response_status: 200,
      response_body: '{\n  "success": true,\n  "message": "Mock response"\n}',
      delay_ms: 0,
      is_enabled: true
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ep) => {
    setEditingEndpoint(ep);
    setFormData({
      name: ep.name,
      description: ep.description || '',
      method: ep.method,
      endpoint_path: ep.endpoint_path,
      response_status: ep.response_status,
      response_body: ep.response_body,
      delay_ms: ep.delay_ms,
      is_enabled: ep.is_enabled === 1
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEndpoint) {
      updateMutation.mutate({ id: editingEndpoint.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCopyUrl = (path, id) => {
    const fullUrl = `http://127.0.0.1:5000/mock/${workspaceSlug}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestInClient = (ep) => {
    const fullUrl = `http://127.0.0.1:5000/mock/${workspaceSlug}${ep.endpoint_path}`;
    createTab({
      name: ep.name,
      method: ep.method,
      urlTemplate: fullUrl,
      bodyType: 'none'
    });
    navigate('/client');
  };

  const handleViewExpressSnippet = async (ep) => {
    try {
      const res = await api.generateCodeSnippets({ mockEndpoint: ep });
      setExpressSnippet(res.data?.expressRoute || '');
      setShowExpressModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-[#26C6DA]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Mock API Server</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Build and serve custom REST mock endpoints instantly. Base URL:{' '}
            <code className="text-[#26C6DA] font-mono font-semibold">
              http://127.0.0.1:5000/mock/{workspaceSlug}/...
            </code>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Workspace Mock Service Toggle */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-bg-border text-xs">
            <span className="text-muted">Mock Service:</span>
            <button
              onClick={() =>
                toggleWorkspaceServiceMutation.mutate(currentWorkspace?.mock_service_enabled === 1 ? 0 : 1)
              }
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                currentWorkspace?.mock_service_enabled === 1
                  ? 'bg-status-success/15 text-status-success border border-status-success/30'
                  : 'bg-status-error/15 text-status-error border border-status-error/30'
              }`}
            >
              {currentWorkspace?.mock_service_enabled === 1 ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Mock Endpoint</span>
          </button>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Configured Endpoints</h3>
          <span className="text-xs text-muted font-mono">{endpoints.length} endpoints</span>
        </div>

        {endpoints.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No mock endpoints configured in this workspace. Click "New Mock Endpoint" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Path</th>
                  <th className="py-2.5 px-4">Response Status</th>
                  <th className="py-2.5 px-4">Delay</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() =>
                          toggleEndpointMutation.mutate({
                            id: ep.id,
                            is_enabled: ep.is_enabled === 1 ? 0 : 1
                          })
                        }
                        className={`w-2.5 h-2.5 rounded-full ${
                          ep.is_enabled === 1 ? 'bg-status-success' : 'bg-status-error'
                        }`}
                        title={ep.is_enabled === 1 ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold badge-${ep.method.toLowerCase()}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                      {ep.endpoint_path}
                      {ep.description && <span className="block text-[11px] text-muted font-normal font-sans">{ep.description}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-status-success font-semibold">{ep.response_status}</span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {ep.delay_ms > 0 ? `${ep.delay_ms}ms` : 'Instant'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopyUrl(ep.endpoint_path, ep.id)}
                        className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
                        title="Copy Mock URL"
                      >
                        {copiedId === ep.id ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleTestInClient(ep)}
                        className="p-1 rounded text-muted hover:text-[#7C6CFF] hover:bg-bg-elevated"
                        title="Open in API Client"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleViewExpressSnippet(ep)}
                        className="p-1 rounded text-muted hover:text-[#26C6DA] hover:bg-bg-elevated"
                        title="View Express Route Code"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(ep)}
                        className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
                        title="Edit Mock Endpoint"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete mock endpoint ${ep.method} ${ep.endpoint_path}?`)) {
                            deleteMutation.mutate(ep.id);
                          }
                        }}
                        className="p-1 text-muted hover:text-status-error"
                        title="Delete Endpoint"
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
      </div>

      {/* Live Mock Server Activity Log */}
      <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-status-success" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Mock Activity Log (Live)</h3>
          </div>
          <span className="text-[10px] text-muted">Updates automatically</span>
        </div>

        {activityLog.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            No mock requests received yet. Call any configured mock endpoint to see live telemetry.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-4">Method</th>
                  <th className="py-2 px-4">Path</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Time</th>
                  <th className="py-2 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {activityLog.map((act) => (
                  <tr key={act.id} className="hover:bg-bg-secondary/40">
                    <td className="py-2 px-4 font-bold">{act.method}</td>
                    <td className="py-2 px-4 text-[var(--text-primary)]">{act.sanitized_path}</td>
                    <td className="py-2 px-4 text-status-success">{act.status_code}</td>
                    <td className="py-2 px-4 text-muted">{Number(act.response_time_ms).toFixed(1)}ms</td>
                    <td className="py-2 px-4 text-muted text-[11px]">{new Date(act.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Endpoint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-bg-primary border border-bg-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-secondary">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {editingEndpoint ? 'Edit Mock Endpoint' : 'Create New Mock Endpoint'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted font-medium">Endpoint Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Get User Profile"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted font-medium">HTTP Method</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted font-medium">Endpoint Path</label>
                  <input
                    type="text"
                    required
                    placeholder="/users/profile"
                    value={formData.endpoint_path}
                    onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted font-medium">Response Status Code</label>
                  <input
                    type="number"
                    required
                    value={formData.response_status}
                    onChange={(e) => setFormData({ ...formData, response_status: Number(e.target.value) })}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-muted font-medium">Artificial Delay (ms): {formData.delay_ms}ms</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="50"
                  value={formData.delay_ms}
                  onChange={(e) => setFormData({ ...formData, delay_ms: Number(e.target.value) })}
                  className="w-full accent-[#7C6CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Response Body (JSON or Text)</label>
                <textarea
                  rows={7}
                  value={formData.response_body}
                  onChange={(e) => setFormData({ ...formData, response_body: e.target.value })}
                  className="w-full bg-bg-secondary border border-bg-border rounded p-3 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-bg-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-bg-secondary text-muted hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#7C6CFF] hover:bg-[#6856f6] text-white font-medium shadow-sm"
                >
                  {editingEndpoint ? 'Save Changes' : 'Create Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Express Snippet Modal */}
      {showExpressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-bg-primary border border-bg-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-secondary">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-[#26C6DA]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generated Express Route Code</h3>
              </div>
              <button onClick={() => setShowExpressModal(false)} className="p-1 text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#0B0D12] overflow-auto max-h-80">
              <pre className="text-xs font-mono text-[#F1F3F7] whitespace-pre-wrap">{expressSnippet}</pre>
            </div>
            <div className="flex justify-end p-3 border-t border-bg-border bg-bg-secondary">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(expressSnippet);
                  alert('Express route code copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded bg-[#7C6CFF] text-white text-xs font-medium"
              >
                Copy Route Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
