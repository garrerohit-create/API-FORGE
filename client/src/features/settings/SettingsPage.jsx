import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Sun,
  Moon,
  ShieldCheck,
  Database,
  RotateCcw,
  Trash2,
  HardDrive,
  Cpu,
  Server,
  Lock,
  Check
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme, activeWorkspaceId } = useAppStore();

  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [saveMessage, setSaveMessage] = useState(null);

  // Queries
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings
  });

  const { data: systemResponse } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: api.getSystemInfo
  });

  const serverConfig = settingsResponse?.data?.serverConfig || {};
  const sysInfo = systemResponse?.data || {};

  // Mutations
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }) => api.updateSetting(key, value),
    onSuccess: () => {
      setSaveMessage('Preferences saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  });

  const resetDemoMutation = useMutation({
    mutationFn: api.resetDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
      alert('Demonstration database records successfully reset.');
    }
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.clearHistory(activeWorkspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      alert('History cleared for active workspace.');
    }
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#7C6CFF]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">System Settings & Architecture</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure appearance, execution safeguards, database persistence, and system runtime info.
          </p>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-lg bg-status-success/10 text-status-success border border-status-success/30 text-xs font-medium flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Appearance Section */}
      <div className="p-5 rounded-xl bg-bg-primary border border-bg-border space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Appearance & Theme</h3>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-[var(--text-primary)]">Interface Theme</span>
            <p className="text-muted text-[11px]">Toggle between High-Contrast Dark and Light engineering themes</p>
          </div>

          <div className="flex items-center space-x-2 bg-bg-secondary p-1 rounded-lg border border-bg-border">
            <button
              onClick={() => {
                if (theme !== 'dark') toggleTheme();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'dark' ? 'bg-[#7C6CFF] text-white shadow-sm' : 'text-muted hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>
            <button
              onClick={() => {
                if (theme !== 'light') toggleTheme();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'light' ? 'bg-[#7C6CFF] text-white shadow-sm' : 'text-muted hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Outbound Request Security Policy */}
      <div className="p-5 rounded-xl bg-bg-primary border border-bg-border space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Outbound Security & SSRF Policy
          </h3>
        </div>

        <div className="p-3.5 rounded-lg bg-bg-secondary border border-bg-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">SSRF Protection Mode</span>
            <span className="font-mono text-emerald-400 font-bold uppercase">
              {serverConfig.allowPublicApiRequests ? 'Public API Mode' : 'Local Demonstration Mode (Active)'}
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Local Demonstration Mode strictly restricts outbound execution to the local server loopback interface
            (127.0.0.1:5000) for mock and demo student endpoints. Recursive calls to the management API (/api/v1), cloud metadata (169.254.169.254), private subnets, and alternative IP encodings are blocked.
          </p>
        </div>
      </div>

      {/* Database & Runtime Specs */}
      <div className="p-5 rounded-xl bg-bg-primary border border-bg-border space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Database & System Specifications</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-bg-secondary border border-bg-border">
            <span className="text-[10px] text-muted uppercase">Database Driver</span>
            <div className="font-bold text-[var(--text-primary)] mt-0.5">Node:SQLite</div>
            <span className="text-[10px] text-emerald-400">Native WAL Mode</span>
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary border border-bg-border">
            <span className="text-[10px] text-muted uppercase">Target Host & Port</span>
            <div className="font-bold text-[var(--text-primary)] mt-0.5">127.0.0.1:5000</div>
            <span className="text-[10px] text-sky-400">Loopback Bound</span>
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary border border-bg-border">
            <span className="text-[10px] text-muted uppercase">Node.js Runtime</span>
            <div className="font-bold text-[var(--text-primary)] mt-0.5">{sysInfo.nodeVersion || 'v24'}</div>
            <span className="text-[10px] text-purple-400">{sysInfo.platform} ({sysInfo.arch})</span>
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary border border-bg-border">
            <span className="text-[10px] text-muted uppercase">Process Uptime</span>
            <div className="font-bold text-[var(--text-primary)] mt-0.5">{sysInfo.uptimeSeconds || 0}s</div>
            <span className="text-[10px] text-muted">Healthy State</span>
          </div>
        </div>
      </div>

      {/* Dangerous Operations / Reset */}
      <div className="p-5 rounded-xl bg-bg-primary border border-status-error/30 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-status-error">Data Safeguards & Reset</h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-[var(--text-primary)]">Reset Demonstration Records</span>
            <p className="text-muted text-[11px]">Re-initializes default student data in SQLite without touching user collections.</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset student records to factory default seeds?')) {
                resetDemoMutation.mutate();
              }
            }}
            className="px-3 py-1.5 rounded bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-amber-400 font-medium"
          >
            Reset Demo Data
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-3 border-t border-bg-border">
          <div>
            <span className="font-semibold text-[var(--text-primary)]">Clear Workspace Request History</span>
            <p className="text-muted text-[11px]">Deletes all execution log records for the active workspace.</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Permanently clear all request history in this workspace?')) {
                clearHistoryMutation.mutate();
              }
            }}
            className="px-3 py-1.5 rounded bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-xs text-rose-400 font-medium"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
