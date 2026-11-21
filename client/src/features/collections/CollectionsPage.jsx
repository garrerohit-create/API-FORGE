import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  FolderPlus,
  Plus,
  Download,
  Upload,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
  Send,
  MoreVertical,
  Layers,
  X,
  FileCode,
  Folder
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, createTab } = useAppStore();

  const [expandedCollections, setExpandedCollections] = useState({});
  const [isCreateColModalOpen, setIsCreateColModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  // Queries
  const { data: collectionsData } = useQuery({
    queryKey: ['collections', activeWorkspaceId],
    queryFn: () => api.getCollections(activeWorkspaceId),
    enabled: !!activeWorkspaceId
  });

  const collections = collectionsData?.data || [];

  // Mutations
  const createCollectionMutation = useMutation({
    mutationFn: (data) => api.createCollection(activeWorkspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setIsCreateColModalOpen(false);
      setColName('');
      setColDesc('');
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (id) => api.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    }
  });

  const importMutation = useMutation({
    mutationFn: (payload) => api.importCollection(activeWorkspaceId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setImportStatus({ success: true, message: data.message || `Successfully imported collection with ${data.importedRequests} requests.` });
    },
    onError: (err) => {
      setImportStatus({ success: false, message: err.message });
    }
  });

  const toggleExpand = (colId) => {
    setExpandedCollections((prev) => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const handleExport = async (colId) => {
    try {
      const data = await api.exportCollection(colId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apiforge-collection-${colId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleOpenRequestInClient = (req) => {
    let headers = [];
    try { headers = JSON.parse(req.headers_json); } catch {}
    let queryParams = [];
    try { queryParams = JSON.parse(req.query_params_json); } catch {}
    let auth = { type: 'none' };
    try { auth = JSON.parse(req.auth_configuration_json); } catch {}

    createTab({
      requestId: req.id,
      name: req.name,
      method: req.method,
      urlTemplate: req.url_template,
      headers,
      queryParams,
      bodyType: req.body_type,
      bodyTemplate: req.body_template,
      auth
    });
    navigate('/client');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Workspaces & Collections</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Organize APIs into collections, folders, and saved requests. Fully persistent in SQLite.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setImportJson('');
              setImportStatus(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setIsCreateColModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {/* Collections List */}
      <div className="space-y-3">
        {collections.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-bg-primary border border-bg-border text-muted text-xs">
            No collections found in this workspace. Create one or import from Postman / API FORGE format.
          </div>
        ) : (
          collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              isExpanded={!!expandedCollections[col.id]}
              onToggle={() => toggleExpand(col.id)}
              onExport={() => handleExport(col.id)}
              onDelete={() => {
                if (confirm(`Delete collection "${col.name}" and all its requests?`)) {
                  deleteCollectionMutation.mutate(col.id);
                }
              }}
              onRun={() => navigate('/runner', { state: { collectionId: col.id } })}
              onOpenRequest={handleOpenRequestInClient}
            />
          ))
        )}
      </div>

      {/* Create Collection Modal */}
      {isCreateColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-primary border border-bg-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Create New Collection</h3>
              <button onClick={() => setIsCreateColModalOpen(false)} className="text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted font-medium">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Authentication Service"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Description</label>
                <textarea
                  rows={3}
                  placeholder="Collection purpose and usage notes..."
                  value={colDesc}
                  onChange={(e) => setColDesc(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-bg-border">
              <button
                onClick={() => setIsCreateColModalOpen(false)}
                className="px-3 py-1.5 rounded bg-bg-secondary text-xs text-muted hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => createCollectionMutation.mutate({ name: colName, description: colDesc })}
                disabled={!colName}
                className="px-4 py-1.5 rounded bg-[#7C6CFF] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-bg-primary border border-bg-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#7C6CFF]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Import Collection</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted">
                Paste JSON content from an API FORGE export (<code>api-forge/v1</code>) or Postman Collection v2.1.
              </p>

              <textarea
                rows={10}
                placeholder="Paste JSON here..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="w-full bg-bg-secondary border border-bg-border rounded p-3 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
              />

              {importStatus && (
                <div
                  className={`p-3 rounded text-xs ${
                    importStatus.success
                      ? 'bg-status-success/10 text-status-success border border-status-success/30'
                      : 'bg-status-error/10 text-status-error border border-status-error/30'
                  }`}
                >
                  {importStatus.message}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-bg-border">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 rounded bg-bg-secondary text-xs text-muted hover:text-[var(--text-primary)]"
              >
                Close
              </button>
              <button
                onClick={() => importMutation.mutate(importJson)}
                disabled={!importJson || importMutation.isPending}
                className="px-4 py-1.5 rounded bg-[#7C6CFF] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Execute Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionCard({ collection, isExpanded, onToggle, onExport, onDelete, onRun, onOpenRequest }) {
  const { data: detailsData } = useQuery({
    queryKey: ['collectionDetails', collection.id],
    queryFn: () => api.getCollection(collection.id),
    enabled: isExpanded
  });

  const requests = detailsData?.data?.requests || [];

  return (
    <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
      {/* Collection Header Bar */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-secondary/40 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-muted">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{collection.name}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-muted border border-bg-border">
                {collection.request_count || requests.length} requests
              </span>
            </div>
            {collection.description && (
              <p className="text-xs text-muted mt-0.5">{collection.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onRun}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#7C6CFF]/15 hover:bg-[#7C6CFF]/25 border border-[#7C6CFF]/30 text-xs text-[#7C6CFF] font-medium"
            title="Run complete collection"
          >
            <Play className="w-3 h-3" />
            <span>Run</span>
          </button>
          <button
            onClick={onExport}
            className="p-1.5 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
            title="Export Collection (Native JSON)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-muted hover:text-status-error hover:bg-bg-elevated"
            title="Delete Collection"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Requests List */}
      {isExpanded && (
        <div className="border-t border-bg-border bg-bg-secondary/30 p-2 space-y-1">
          {requests.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted">Collection has no saved requests yet.</div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                onClick={() => onOpenRequest(req)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-elevated/60 border border-bg-border/60 cursor-pointer text-xs font-mono transition-colors group"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded badge-${req.method.toLowerCase()}`}>
                    {req.method}
                  </span>
                  <span className="font-sans font-medium text-[var(--text-primary)] truncate">{req.name}</span>
                  <span className="text-muted text-[11px] truncate max-w-xs">{req.url_template}</span>
                </div>

                <div className="flex items-center space-x-2 text-muted text-[11px]">
                  {req.test_case_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-sans text-[10px]">
                      {req.test_case_count} tests
                    </span>
                  )}
                  <Send className="w-3.5 h-3.5 group-hover:text-[#7C6CFF] transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
