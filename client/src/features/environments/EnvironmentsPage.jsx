import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Plus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function EnvironmentsPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId, activeEnvironmentId, setActiveEnvironmentId } = useAppStore();

  const [selectedEnvId, setSelectedEnvId] = useState(activeEnvironmentId || 'env-local');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [sessionSecrets, setSessionSecrets] = useState({});
  const [showSecretMap, setShowSecretMap] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  // Queries
  const { data: envsResponse } = useQuery({
    queryKey: ['environments', activeWorkspaceId],
    queryFn: () => api.getEnvironments(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const environments = envsResponse?.data || [];
  const selectedEnv = environments.find((e) => e.id === selectedEnvId) || environments[0];

  // Local editing variables state
  const [variables, setVariables] = useState([]);

  React.useEffect(() => {
    if (selectedEnv?.variables) {
      setVariables(selectedEnv.variables);
    }
  }, [selectedEnv]);

  // Mutations
  const createEnvMutation = useMutation({
    mutationFn: (data) => api.createEnvironment(activeWorkspaceId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setIsCreateModalOpen(false);
      setNewEnvName('');
      setSelectedEnvId(res.data.id);
    }
  });

  const updateEnvMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateEnvironment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setSaveStatus('Environment updated successfully.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  });

  const deleteEnvMutation = useMutation({
    mutationFn: (id) => api.deleteEnvironment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setSelectedEnvId(environments[0]?.id || '');
    }
  });

  const saveSecretsMutation = useMutation({
    mutationFn: ({ id, secrets }) => api.setSessionSecrets(id, secrets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      alert('Session secrets stored in backend process memory.');
    }
  });

  const handleAddVariable = () => {
    setVariables([
      ...variables,
      {
        id: `var-${Date.now()}`,
        variable_key: '',
        variable_value: '',
        is_secret: 0,
        is_enabled: 1
      }
    ]);
  };

  const handleRemoveVariable = (idx) => {
    setVariables(variables.filter((_, i) => i !== idx));
  };

  const handleSaveEnvironment = () => {
    if (!selectedEnv) return;
    updateEnvMutation.mutate({
      id: selectedEnv.id,
      data: {
        name: selectedEnv.name,
        variables
      }
    });

    // Also push any updated session secrets
    if (Object.keys(sessionSecrets).length > 0) {
      saveSecretsMutation.mutate({ id: selectedEnv.id, secrets: sessionSecrets });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#7C6CFF]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Environment Variables</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure reusable variables interpolated into URLs, headers, bodies and auth via{' '}
            <code className="text-[#7C6CFF] font-mono font-semibold">{'{{variable_name}}'}</code>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Environment</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-3.5 rounded-lg bg-[#7C6CFF]/10 border border-[#7C6CFF]/30 text-xs flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-[#7C6CFF] flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-[var(--text-primary)]">Process Memory Secret Isolation</span>
          <p className="text-muted text-[11px]">
            Variables marked as <span className="text-rose-400 font-mono">Secret</span> have their live values kept strictly in backend process memory for the current session. They are never persisted in SQLite or exported.
          </p>
        </div>
      </div>

      {/* Environment Selector Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {environments.map((env) => (
          <button
            key={env.id}
            onClick={() => {
              setSelectedEnvId(env.id);
              setActiveEnvironmentId(env.id);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              env.id === selectedEnvId
                ? 'bg-[#7C6CFF]/15 text-[#7C6CFF] border-[#7C6CFF]/40 font-semibold'
                : 'bg-bg-primary text-muted border-bg-border hover:text-[var(--text-primary)]'
            }`}
          >
            {env.name}
            {env.id === activeEnvironmentId && (
              <span className="ml-1.5 text-[9px] uppercase px-1 py-0.2 rounded bg-[#7C6CFF] text-white">Active</span>
            )}
          </button>
        ))}
      </div>

      {/* Variables Editor Table */}
      {selectedEnv && (
        <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
          <div className="p-4 border-b border-bg-border flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Variables in {selectedEnv.name}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddVariable}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-muted hover:text-[var(--text-primary)]"
              >
                <Plus className="w-3 h-3" />
                <span>Add Row</span>
              </button>
              <button
                onClick={handleSaveEnvironment}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-medium shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Variables</span>
              </button>
            </div>
          </div>

          {saveStatus && (
            <div className="bg-status-success/10 text-status-success px-4 py-2 text-xs border-b border-status-success/30 font-medium">
              {saveStatus}
            </div>
          )}

          <div className="overflow-x-auto p-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-muted px-2">
              <span className="col-span-1">Enabled</span>
              <span className="col-span-4">Variable Key</span>
              <span className="col-span-5">Value</span>
              <span className="col-span-1 text-center">Secret</span>
              <span className="col-span-1 text-right">Delete</span>
            </div>

            {variables.map((v, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center font-mono text-xs">
                {/* Enabled checkbox */}
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={v.is_enabled !== 0 && v.is_enabled !== false}
                    onChange={(e) => {
                      const updated = [...variables];
                      updated[idx].is_enabled = e.target.checked ? 1 : 0;
                      setVariables(updated);
                    }}
                    className="accent-[#7C6CFF]"
                  />
                </div>

                {/* Key */}
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="variable_key"
                    value={v.variable_key || ''}
                    onChange={(e) => {
                      const updated = [...variables];
                      updated[idx].variable_key = e.target.value;
                      setVariables(updated);
                    }}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                </div>

                {/* Value */}
                <div className="col-span-5 relative">
                  <input
                    type={v.is_secret === 1 && !showSecretMap[idx] ? 'password' : 'text'}
                    placeholder={v.is_secret === 1 ? 'Enter session secret value...' : 'Variable value'}
                    value={v.variable_value ?? ''}
                    onChange={(e) => {
                      const updated = [...variables];
                      updated[idx].variable_value = e.target.value;
                      setVariables(updated);
                      if (v.is_secret === 1) {
                        setSessionSecrets((prev) => ({
                          ...prev,
                          [v.variable_key]: e.target.value
                        }));
                      }
                    }}
                    className="w-full bg-bg-secondary border border-bg-border rounded px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                  {v.is_secret === 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecretMap((prev) => ({
                          ...prev,
                          [idx]: !prev[idx]
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text-primary)]"
                    >
                      {showSecretMap[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Secret Toggle */}
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...variables];
                      const nextSecret = v.is_secret === 1 ? 0 : 1;
                      updated[idx].is_secret = nextSecret;
                      setVariables(updated);
                    }}
                    className={`p-1 rounded ${
                      v.is_secret === 1 ? 'text-rose-400 bg-rose-500/10' : 'text-muted hover:text-[var(--text-primary)]'
                    }`}
                    title={v.is_secret === 1 ? 'Session Secret (Memory Only)' : 'Standard Variable'}
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleRemoveVariable(idx)}
                    className="p-1 text-muted hover:text-status-error"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {variables.length === 0 && (
              <div className="py-6 text-center text-xs text-muted">No variables in this environment. Click "Add Row" to add one.</div>
            )}
          </div>
        </div>
      )}

      {/* Create Environment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-bg-primary border border-bg-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Environment</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-muted font-medium">Environment Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Staging Simulation"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-bg-border">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-bg-secondary text-xs text-muted hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => createEnvMutation.mutate({ name: newEnvName })}
                disabled={!newEnvName}
                className="px-4 py-1.5 rounded bg-[#7C6CFF] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
