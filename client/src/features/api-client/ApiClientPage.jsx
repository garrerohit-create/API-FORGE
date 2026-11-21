import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  X,
  Plus,
  Copy,
  Download,
  Trash2,
  Code,
  Save,
  Check,
  AlertTriangle,
  Clock,
  HardDrive,
  FileText,
  Key,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useAppStore } from '../../stores/workspaceStore.js';
import { api } from '../../services/api.js';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function ApiClientPage() {
  const queryClient = useQueryClient();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    createTab,
    closeTab,
    updateActiveTab,
    duplicateActiveTab,
    activeWorkspaceId,
    activeEnvironmentId
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // UI States
  const [activeConfigTab, setActiveConfigTab] = useState('params'); // params, headers, body, auth, tests, settings
  const [activeResponseTab, setActiveResponseTab] = useState('pretty'); // pretty, raw, headers, tests
  const [responseResult, setResponseResult] = useState(null);
  const [activeExecutionId, setActiveExecutionId] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSnippets, setCodeSnippets] = useState({});
  const [activeSnippetLang, setActiveSnippetLang] = useState('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Keyboard shortcut Ctrl+Enter to execute request
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeWorkspaceId, activeEnvironmentId]);

  // Request Execution Mutation
  const executeMutation = useMutation({
    mutationFn: (payload) => api.executeRequest(payload),
    onSuccess: (data) => {
      setResponseResult(data.data);
      setActiveExecutionId(null);
      // Invalidate history & analytics queries so dashboard updates immediately
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      setActiveExecutionId(null);
      setResponseResult({
        status: 0,
        statusText: 'Execution Error',
        durationMs: 0,
        sizeBytes: 0,
        headers: {},
        body: null,
        rawBody: '',
        error: {
          code: err.code || 'REQUEST_FAILED',
          message: err.message
        },
        assertions: { total: 0, passed: 0, failed: 0, skipped: 0, results: [] }
      });
    }
  });

  const handleExecute = () => {
    if (!activeTab.urlTemplate) return;

    setResponseResult(null);
    executeMutation.mutate({
      workspaceId: activeWorkspaceId,
      environmentId: activeEnvironmentId,
      requestId: activeTab.requestId || null,
      method: activeTab.method,
      urlTemplate: activeTab.urlTemplate,
      headers: activeTab.headers || [],
      queryParams: activeTab.queryParams || [],
      bodyType: activeTab.bodyType || 'none',
      bodyTemplate: activeTab.bodyTemplate || null,
      auth: activeTab.auth || { type: 'none' },
      settings: activeTab.settings || { timeoutMs: 15000 },
      assertions: activeTab.assertions || []
    });
  };

  const handleCancel = () => {
    if (activeExecutionId) {
      api.cancelExecution(activeExecutionId);
      setActiveExecutionId(null);
    }
  };

  // Open Code Generation Snippets
  const handleOpenCodeModal = async () => {
    try {
      const res = await api.generateCodeSnippets({
        request: {
          method: activeTab.method,
          url: activeTab.urlTemplate,
          headers: activeTab.headers,
          bodyType: activeTab.bodyType,
          body: activeTab.bodyTemplate
        }
      });
      setCodeSnippets(res.data || {});
      setShowCodeModal(true);
    } catch (err) {
      console.error('Failed to generate snippets:', err);
    }
  };

  const handleCopySnippet = () => {
    const text = codeSnippets[activeSnippetLang] || '';
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyResponseBody = () => {
    if (!responseResult) return;
    const content = responseResult.body
      ? JSON.stringify(responseResult.body, null, 2)
      : responseResult.rawBody;
    navigator.clipboard.writeText(content);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleDownloadResponse = () => {
    if (!responseResult) return;
    const content = responseResult.body
      ? JSON.stringify(responseResult.body, null, 2)
      : responseResult.rawBody;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format JSON in Body
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(activeTab.bodyTemplate);
      updateActiveTab({ bodyTemplate: JSON.stringify(parsed, null, 2) });
    } catch {
      alert('Cannot format: invalid JSON content');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-main overflow-hidden">
      {/* 1. Request Tabs Bar */}
      <div className="flex items-center bg-bg-sidebar border-b border-bg-border px-2 pt-1.5 space-x-1 overflow-x-auto select-none">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`group flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer border-t border-x transition-colors ${
              tab.id === activeTabId
                ? 'bg-bg-primary text-[var(--text-primary)] border-bg-border border-b-transparent font-semibold shadow-sm'
                : 'text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated/40 border-transparent'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase font-mono ${getMethodColor(tab.method)}`}>
              {tab.method}
            </span>
            <span className="max-w-[120px] truncate">{tab.name || 'Untitled'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="p-0.5 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={() => createTab()}
          className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated transition-colors"
          title="New Request Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Main Request & Response Panels */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left / Upper Panel: Request Builder */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-bg-border overflow-hidden">
          {/* Request Header Bar */}
          <div className="p-3 border-b border-bg-border bg-bg-primary space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={activeTab.name || ''}
                onChange={(e) => updateActiveTab({ name: e.target.value })}
                placeholder="Request Name"
                className="text-xs font-semibold bg-transparent text-[var(--text-primary)] focus:outline-none hover:border-b border-[#7C6CFF]/50 px-1 py-0.5"
              />
              <span className="text-[10px] text-muted font-mono">
                {activeTab.requestId ? `(Saved ID: ${activeTab.requestId})` : '(Unsaved)'}
              </span>
            </div>

            {/* HTTP Method, URL Input & Action Buttons */}
            <div className="flex items-center space-x-2">
              <select
                value={activeTab.method}
                onChange={(e) => updateActiveTab({ method: e.target.value })}
                className="bg-bg-secondary border border-bg-border rounded px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-[#7C6CFF] text-[var(--text-primary)] cursor-pointer"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={activeTab.urlTemplate || ''}
                  onChange={(e) => updateActiveTab({ urlTemplate: e.target.value })}
                  placeholder="https://api.example.com/v1/resource or {{base_url}}/demo/v1/students"
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF] placeholder-muted"
                />
              </div>

              {executeMutation.isPending ? (
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              ) : (
                <button
                  onClick={handleExecute}
                  disabled={!activeTab.urlTemplate}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-[#7C6CFF] hover:bg-[#6856f6] disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
                  title="Execute Request (Ctrl+Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              )}

              <button
                onClick={handleOpenCodeModal}
                className="p-1.5 rounded bg-bg-secondary border border-bg-border text-muted hover:text-[var(--text-primary)] transition-colors"
                title="Generate Code Snippets"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Request Configuration Sub-Tabs */}
          <div className="flex items-center bg-bg-secondary border-b border-bg-border px-3 text-xs select-none space-x-3">
            {[
              { id: 'params', label: `Params (${(activeTab.queryParams || []).length})` },
              { id: 'headers', label: `Headers (${(activeTab.headers || []).length})` },
              { id: 'body', label: `Body ${activeTab.bodyType !== 'none' ? `(${activeTab.bodyType})` : ''}` },
              { id: 'auth', label: `Auth ${activeTab.auth?.type !== 'none' ? `(${activeTab.auth?.type})` : ''}` },
              { id: 'tests', label: `Tests (${(activeTab.assertions || []).length})` },
              { id: 'settings', label: 'Settings' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveConfigTab(t.id)}
                className={`py-2 px-1 border-b-2 font-medium transition-colors ${
                  activeConfigTab === t.id
                    ? 'border-[#7C6CFF] text-[#7C6CFF]'
                    : 'border-transparent text-muted hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Config Editor Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-bg-primary text-xs">
            {/* 1. Query Params Editor */}
            {activeConfigTab === 'params' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-muted text-[11px]">
                  <span>Query Parameters</span>
                  <button
                    onClick={() => {
                      const updated = [...(activeTab.queryParams || []), { key: '', value: '', enabled: true }];
                      updateActiveTab({ queryParams: updated });
                    }}
                    className="flex items-center space-x-1 text-[#7C6CFF] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="space-y-1.5 font-mono">
                  {(activeTab.queryParams || []).map((param, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={param.enabled !== false}
                        onChange={(e) => {
                          const updated = [...activeTab.queryParams];
                          updated[idx].enabled = e.target.checked;
                          updateActiveTab({ queryParams: updated });
                        }}
                        className="rounded border-bg-border accent-[#7C6CFF]"
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => {
                          const updated = [...activeTab.queryParams];
                          updated[idx].key = e.target.value;
                          updateActiveTab({ queryParams: updated });
                        }}
                        className="flex-1 bg-bg-secondary border border-bg-border rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => {
                          const updated = [...activeTab.queryParams];
                          updated[idx].value = e.target.value;
                          updateActiveTab({ queryParams: updated });
                        }}
                        className="flex-1 bg-bg-secondary border border-bg-border rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                      <button
                        onClick={() => {
                          const updated = activeTab.queryParams.filter((_, i) => i !== idx);
                          updateActiveTab({ queryParams: updated });
                        }}
                        className="p-1 text-muted hover:text-status-error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(activeTab.queryParams || []).length === 0 && (
                    <div className="text-center py-6 text-muted text-xs font-sans">
                      No query parameters configured.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Headers Editor */}
            {activeConfigTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-muted text-[11px]">
                  <span>HTTP Headers</span>
                  <button
                    onClick={() => {
                      const updated = [...(activeTab.headers || []), { key: '', value: '', enabled: true }];
                      updateActiveTab({ headers: updated });
                    }}
                    className="flex items-center space-x-1 text-[#7C6CFF] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Header</span>
                  </button>
                </div>

                <div className="space-y-1.5 font-mono">
                  {(activeTab.headers || []).map((hdr, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hdr.enabled !== false}
                        onChange={(e) => {
                          const updated = [...activeTab.headers];
                          updated[idx].enabled = e.target.checked;
                          updateActiveTab({ headers: updated });
                        }}
                        className="rounded border-bg-border accent-[#7C6CFF]"
                      />
                      <input
                        type="text"
                        placeholder="Header Key (e.g. Content-Type)"
                        value={hdr.key}
                        onChange={(e) => {
                          const updated = [...activeTab.headers];
                          updated[idx].key = e.target.value;
                          updateActiveTab({ headers: updated });
                        }}
                        className="flex-1 bg-bg-secondary border border-bg-border rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                      <input
                        type="text"
                        placeholder="Header Value"
                        value={hdr.value}
                        onChange={(e) => {
                          const updated = [...activeTab.headers];
                          updated[idx].value = e.target.value;
                          updateActiveTab({ headers: updated });
                        }}
                        className="flex-1 bg-bg-secondary border border-bg-border rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                      <button
                        onClick={() => {
                          const updated = activeTab.headers.filter((_, i) => i !== idx);
                          updateActiveTab({ headers: updated });
                        }}
                        className="p-1 text-muted hover:text-status-error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Body Editor */}
            {activeConfigTab === 'body' && (
              <div className="space-y-3 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    {['none', 'json', 'text', 'urlencoded'].map((btype) => (
                      <label key={btype} className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="bodyType"
                          value={btype}
                          checked={activeTab.bodyType === btype}
                          onChange={(e) => updateActiveTab({ bodyType: e.target.value })}
                          className="accent-[#7C6CFF]"
                        />
                        <span className="uppercase text-[11px] font-mono">{btype}</span>
                      </label>
                    ))}
                  </div>

                  {activeTab.bodyType === 'json' && (
                    <button
                      onClick={handleFormatJson}
                      className="px-2 py-1 text-[11px] font-mono rounded bg-bg-secondary border border-bg-border text-muted hover:text-[var(--text-primary)]"
                    >
                      Format JSON
                    </button>
                  )}
                </div>

                {activeTab.bodyType === 'none' ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted">
                    This request does not have a body payload.
                  </div>
                ) : (
                  <textarea
                    value={activeTab.bodyTemplate || ''}
                    onChange={(e) => updateActiveTab({ bodyTemplate: e.target.value })}
                    placeholder={activeTab.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter raw payload...'}
                    className="flex-1 w-full bg-bg-secondary border border-bg-border rounded p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF] resize-none h-60"
                  />
                )}
              </div>
            )}

            {/* 4. Authorization Tab */}
            {activeConfigTab === 'auth' && (
              <div className="space-y-4 max-w-lg">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-muted font-medium">Auth Type</label>
                  <select
                    value={activeTab.auth?.type || 'none'}
                    onChange={(e) =>
                      updateActiveTab({
                        auth: { ...activeTab.auth, type: e.target.value }
                      })
                    }
                    className="bg-bg-secondary border border-bg-border rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="api_key">API Key</option>
                  </select>
                </div>

                {activeTab.auth?.type === 'bearer' && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted font-medium">Bearer Token</label>
                    <input
                      type="password"
                      placeholder="Enter token or {{token_var}}"
                      value={activeTab.auth?.token || ''}
                      onChange={(e) =>
                        updateActiveTab({
                          auth: { ...activeTab.auth, token: e.target.value }
                        })
                      }
                      className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                    />
                  </div>
                )}

                {activeTab.auth?.type === 'basic' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Username</label>
                      <input
                        type="text"
                        placeholder="Username"
                        value={activeTab.auth?.username || ''}
                        onChange={(e) =>
                          updateActiveTab({
                            auth: { ...activeTab.auth, username: e.target.value }
                          })
                        }
                        className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Password</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={activeTab.auth?.password || ''}
                        onChange={(e) =>
                          updateActiveTab({
                            auth: { ...activeTab.auth, password: e.target.value }
                          })
                        }
                        className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                    </div>
                  </div>
                )}

                {activeTab.auth?.type === 'api_key' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Key Name</label>
                      <input
                        type="text"
                        placeholder="e.g. X-API-Key"
                        value={activeTab.auth?.key || ''}
                        onChange={(e) =>
                          updateActiveTab({
                            auth: { ...activeTab.auth, key: e.target.value }
                          })
                        }
                        className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Value</label>
                      <input
                        type="password"
                        placeholder="Secret key value"
                        value={activeTab.auth?.value || ''}
                        onChange={(e) =>
                          updateActiveTab({
                            auth: { ...activeTab.auth, value: e.target.value }
                          })
                        }
                        className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Tests / Assertions Editor */}
            {activeConfigTab === 'tests' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-muted text-[11px]">
                  <span>Declarative Automated Assertions</span>
                  <button
                    onClick={() => {
                      const updated = [
                        ...(activeTab.assertions || []),
                        {
                          id: `tc-${Date.now()}`,
                          name: 'Status code is 200',
                          assertion_type: 'status_equals',
                          assertion_target: '',
                          expected_value_json: '200',
                          is_enabled: true
                        }
                      ];
                      updateActiveTab({ assertions: updated });
                    }}
                    className="flex items-center space-x-1 text-[#7C6CFF] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Assertion</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(activeTab.assertions || []).map((ast, idx) => (
                    <div
                      key={ast.id || idx}
                      className="p-3 rounded bg-bg-secondary border border-bg-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={ast.name}
                          onChange={(e) => {
                            const updated = [...activeTab.assertions];
                            updated[idx].name = e.target.value;
                            updateActiveTab({ assertions: updated });
                          }}
                          placeholder="Assertion Name"
                          className="font-medium bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const updated = activeTab.assertions.filter((_, i) => i !== idx);
                            updateActiveTab({ assertions: updated });
                          }}
                          className="text-muted hover:text-status-error"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select
                          value={ast.assertion_type}
                          onChange={(e) => {
                            const updated = [...activeTab.assertions];
                            updated[idx].assertion_type = e.target.value;
                            updateActiveTab({ assertions: updated });
                          }}
                          className="bg-bg-primary border border-bg-border rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                        >
                          <option value="status_equals">Status Code Equals</option>
                          <option value="status_category">Status Category (e.g. 2xx)</option>
                          <option value="time_below">Latency Below (ms)</option>
                          <option value="size_below">Response Size Below (bytes)</option>
                          <option value="header_exists">Header Exists</option>
                          <option value="header_contains">Header Contains</option>
                          <option value="json_valid">Valid JSON Body</option>
                          <option value="json_property_exists">JSON Property Exists</option>
                          <option value="json_property_equals">JSON Property Equals</option>
                          <option value="json_property_type">JSON Property Type</option>
                          <option value="json_array_length">JSON Array Length Equals</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Target (e.g. data.students[0].id)"
                          value={ast.assertion_target || ''}
                          onChange={(e) => {
                            const updated = [...activeTab.assertions];
                            updated[idx].assertion_target = e.target.value;
                            updateActiveTab({ assertions: updated });
                          }}
                          className="bg-bg-primary border border-bg-border rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                        />

                        <input
                          type="text"
                          placeholder="Expected Value"
                          value={ast.expected_value_json ?? ''}
                          onChange={(e) => {
                            const updated = [...activeTab.assertions];
                            updated[idx].expected_value_json = e.target.value;
                            updateActiveTab({ assertions: updated });
                          }}
                          className="bg-bg-primary border border-bg-border rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                        />
                      </div>
                    </div>
                  ))}

                  {(activeTab.assertions || []).length === 0 && (
                    <div className="text-center py-6 text-muted text-xs">
                      No assertions attached. Add assertions to automatically validate status, response time, and JSON schemas!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Settings */}
            {activeConfigTab === 'settings' && (
              <div className="space-y-4 max-w-sm">
                <div className="space-y-1">
                  <label className="text-xs text-muted font-medium">Request Timeout (ms)</label>
                  <input
                    type="number"
                    value={activeTab.settings?.timeoutMs || 15000}
                    onChange={(e) =>
                      updateActiveTab({
                        settings: { ...activeTab.settings, timeoutMs: Number(e.target.value) }
                      })
                    }
                    className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                  />
                  <span className="text-[10px] text-muted">Max server limit: 60,000ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right / Lower Panel: Response Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg-primary overflow-hidden">
          {/* Response Metadata Bar */}
          <div className="flex items-center justify-between p-3 border-b border-bg-border bg-bg-secondary select-none">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Response</span>
              {responseResult && (
                <>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      responseResult.status >= 200 && responseResult.status < 300
                        ? 'bg-status-success/15 text-status-success border border-status-success/30'
                        : 'bg-status-error/15 text-status-error border border-status-error/30'
                    }`}
                  >
                    {responseResult.status} {responseResult.statusText}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-muted font-mono">
                    <Clock className="w-3 h-3 text-[#26C6DA]" />
                    <span>{Number(responseResult.durationMs).toFixed(1)} ms</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted font-mono">
                    <HardDrive className="w-3 h-3 text-sky-400" />
                    <span>{responseResult.sizeBytes} B</span>
                  </div>
                </>
              )}
            </div>

            {responseResult && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyResponseBody}
                  className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated transition-colors"
                  title="Copy Response Body"
                >
                  {copiedResponse ? <Check className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownloadResponse}
                  className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated transition-colors"
                  title="Download Response as JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Response Tabs */}
          {responseResult && (
            <div className="flex items-center bg-bg-primary border-b border-bg-border px-3 text-xs select-none space-x-3">
              {['pretty', 'raw', 'headers', 'tests'].map((rtab) => (
                <button
                  key={rtab}
                  onClick={() => setActiveResponseTab(rtab)}
                  className={`py-2 px-1 border-b-2 font-medium transition-colors uppercase text-[11px] font-mono ${
                    activeResponseTab === rtab
                      ? 'border-[#7C6CFF] text-[#7C6CFF]'
                      : 'border-transparent text-muted hover:text-[var(--text-primary)]'
                  }`}
                >
                  {rtab === 'tests'
                    ? `Test Results (${responseResult.assertions?.passed || 0}/${responseResult.assertions?.total || 0})`
                    : rtab}
                </button>
              ))}
            </div>
          )}

          {/* Response Content Area */}
          <div className="flex-1 overflow-auto p-3 font-mono text-xs">
            {!responseResult ? (
              <div className="flex flex-col items-center justify-center h-full text-muted space-y-2">
                <Send className="w-8 h-8 opacity-20" />
                <span className="text-xs font-sans">Enter an endpoint URL and click Send to inspect response.</span>
              </div>
            ) : responseResult.error ? (
              <div className="p-4 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error space-y-2">
                <div className="flex items-center space-x-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Transport / Execution Failure</span>
                </div>
                <div className="text-xs font-mono">{responseResult.error.message}</div>
                <div className="text-[10px] text-muted">Category: {responseResult.error.code}</div>
              </div>
            ) : activeResponseTab === 'pretty' ? (
              <pre className="text-[var(--text-primary)] whitespace-pre-wrap">
                {responseResult.body ? JSON.stringify(responseResult.body, null, 2) : responseResult.rawBody}
              </pre>
            ) : activeResponseTab === 'raw' ? (
              <pre className="text-[var(--text-primary)] whitespace-pre-wrap">{responseResult.rawBody}</pre>
            ) : activeResponseTab === 'headers' ? (
              <div className="space-y-1">
                {Object.entries(responseResult.headers || {}).map(([k, v]) => (
                  <div key={k} className="flex border-b border-bg-border/60 py-1">
                    <span className="w-1/3 text-[#7C6CFF] font-semibold">{k}</span>
                    <span className="w-2/3 text-[var(--text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            ) : activeResponseTab === 'tests' ? (
              <div className="space-y-2">
                {responseResult.assertions?.results?.map((res, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded border text-xs flex items-start space-x-2 ${
                      res.result_status === 'passed'
                        ? 'bg-status-success/10 border-status-success/30 text-status-success'
                        : 'bg-status-error/10 border-status-error/30 text-status-error'
                    }`}
                  >
                    {res.result_status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-0.5">
                      <div className="font-semibold">{res.assertion_name_snapshot}</div>
                      {res.failure_message_sanitized && (
                        <div className="text-[11px] text-rose-300 font-mono">
                          {res.failure_message_sanitized}
                        </div>
                      )}
                      <div className="text-[10px] text-muted font-mono">
                        Expected: {res.expected_value_sanitized} | Actual: {res.actual_value_sanitized}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Code Generation Snippet Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-bg-primary border border-bg-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-secondary">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-[#7C6CFF]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generate Client Code</h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1 rounded text-muted hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex border-b border-bg-border bg-bg-secondary px-4 text-xs font-mono space-x-2">
              {['curl', 'fetch', 'axios', 'python'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveSnippetLang(lang)}
                  className={`py-2 px-3 border-b-2 font-semibold uppercase ${
                    activeSnippetLang === lang
                      ? 'border-[#7C6CFF] text-[#7C6CFF]'
                      : 'border-transparent text-muted hover:text-[var(--text-primary)]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Snippet Display */}
            <div className="p-4 flex-1 overflow-auto bg-[#0B0D12]">
              <pre className="text-xs font-mono text-[#F1F3F7] whitespace-pre-wrap">
                {codeSnippets[activeSnippetLang] || 'Generating snippet...'}
              </pre>
            </div>

            <div className="flex items-center justify-between p-3 border-t border-bg-border bg-bg-secondary">
              <span className="text-[10px] text-muted">Secrets and sensitive tokens are automatically masked.</span>
              <button
                onClick={handleCopySnippet}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-medium"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getMethodColor(method) {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'text-emerald-400';
    case 'POST':
      return 'text-sky-400';
    case 'PUT':
      return 'text-amber-400';
    case 'PATCH':
      return 'text-purple-400';
    case 'DELETE':
      return 'text-rose-400';
    default:
      return 'text-muted';
  }
}
