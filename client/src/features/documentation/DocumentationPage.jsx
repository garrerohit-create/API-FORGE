import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Server
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function DocumentationPage() {
  const { activeWorkspaceId } = useAppStore();
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [activeTab, setActiveTab] = useState('interactive'); // 'interactive' or 'json'

  const { data: specData, isLoading } = useQuery({
    queryKey: ['openapi', activeWorkspaceId],
    queryFn: () => api.getOpenApiSpec(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const spec = specData || null;

  const handleDownloadJson = () => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openapi-spec-${activeWorkspaceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = async () => {
    try {
      const md = await api.getDocsMarkdown(activeWorkspaceId);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-documentation-${activeWorkspaceId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Markdown export failed: ${err.message}`);
    }
  };

  const handleCopyJson = () => {
    if (!spec) return;
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#7C6CFF]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">OpenAPI Documentation</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Standard OpenAPI 3.0-compatible specification generated for configured mock endpoints and the demonstration CRUD API.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyJson}
            disabled={!spec}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
          >
            {copiedSpec ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Spec</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            disabled={!spec}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#26C6DA]" />
            <span>Markdown</span>
          </button>
          <button
            onClick={handleDownloadJson}
            disabled={!spec}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>OpenAPI JSON</span>
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex border-b border-bg-border text-xs space-x-4">
        <button
          onClick={() => setActiveTab('interactive')}
          className={`py-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === 'interactive'
              ? 'border-[#7C6CFF] text-[#7C6CFF]'
              : 'border-transparent text-muted hover:text-[var(--text-primary)]'
          }`}
        >
          Interactive View
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`py-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === 'json'
              ? 'border-[#7C6CFF] text-[#7C6CFF]'
              : 'border-transparent text-muted hover:text-[var(--text-primary)]'
          }`}
        >
          Raw OpenAPI JSON
        </button>
      </div>

      {!spec ? (
        <div className="p-12 text-center text-xs text-muted rounded-xl bg-bg-primary border border-bg-border">
          Loading OpenAPI specification...
        </div>
      ) : activeTab === 'json' ? (
        <div className="p-4 rounded-xl bg-[#0B0D12] border border-bg-border overflow-auto max-h-[650px]">
          <pre className="text-xs font-mono text-[#F1F3F7] whitespace-pre-wrap">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spec Info Box */}
          <div className="p-4 rounded-xl bg-bg-primary border border-bg-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{spec.info.title}</h3>
              <p className="text-xs text-muted">{spec.info.description}</p>
            </div>
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-bg-secondary text-muted border border-bg-border">
                OpenAPI {spec.openapi}
              </span>
              <span className="px-2 py-0.5 rounded bg-bg-secondary text-[#7C6CFF] border border-bg-border">
                {spec.servers?.[0]?.url}
              </span>
            </div>
          </div>

          {/* Endpoints List */}
          <div className="space-y-2">
            {Object.entries(spec.paths || {}).map(([pathKey, methods]) =>
              Object.entries(methods).map(([methodKey, details]) => (
                <div
                  key={`${methodKey}-${pathKey}`}
                  className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3.5 bg-bg-secondary/40 font-mono text-xs">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase badge-${methodKey.toLowerCase()}`}>
                        {methodKey}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{pathKey}</span>
                      <span className="text-muted font-sans text-xs">{details.summary}</span>
                    </div>

                    <span className="text-[10px] text-muted font-sans uppercase">
                      {details.tags?.[0] || 'API'}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-xs border-t border-bg-border">
                    {details.description && (
                      <p className="text-muted text-xs">{details.description}</p>
                    )}

                    {/* Parameters */}
                    {details.parameters && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted uppercase">Parameters</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                          {details.parameters.map((p, idx) => (
                            <div key={idx} className="p-2 rounded bg-bg-secondary border border-bg-border">
                              <span className="font-bold text-[#7C6CFF]">{p.name}</span>
                              <span className="text-muted ml-1">({p.in})</span>
                              {p.required && <span className="text-rose-400 ml-1">*required</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    {details.responses && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-muted uppercase">Responses</span>
                        <div className="space-y-2 font-mono">
                          {Object.entries(details.responses).map(([statusCode, resObj]) => (
                            <div key={statusCode} className="p-2.5 rounded bg-bg-secondary border border-bg-border space-y-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    statusCode.startsWith('2') ? 'text-status-success' : 'text-status-error'
                                  }`}
                                >
                                  {statusCode}
                                </span>
                                <span className="text-muted text-xs font-sans">{resObj.description}</span>
                              </div>

                              {resObj.content?.['application/json']?.example && (
                                <pre className="p-2 rounded bg-[#0B0D12] text-[11px] text-[#F1F3F7] overflow-auto max-h-40">
                                  {JSON.stringify(resObj.content['application/json'].example, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
