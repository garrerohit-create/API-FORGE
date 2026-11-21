import React from 'react';
import { useAppStore } from '../../stores/workspaceStore.js';
import { ShieldCheck, Server, Layers, Cpu } from 'lucide-react';

export default function StatusBar() {
  const { workspaces, activeWorkspaceId, environments, activeEnvironmentId, backendConnected } = useAppStore();

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <footer className="flex items-center justify-between px-3 h-6 bg-bg-sidebar border-t border-bg-border text-[11px] text-muted select-none z-10 font-mono">
      {/* Left: Active Workspace & Environment */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Layers className="w-3 h-3 text-[#7C6CFF]" />
          <span>{currentWorkspace?.name || 'Workspace: None'}</span>
        </div>
        <span>•</span>
        <div className="flex items-center space-x-1">
          <span>Env: {currentEnv?.name || 'None'}</span>
        </div>
      </div>

      {/* Right: Security Mode & Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 text-emerald-400" title="SSRF Protection Active">
          <ShieldCheck className="w-3 h-3" />
          <span>SSRF Guard: Local Safe</span>
        </div>
        <span>•</span>
        <div className="flex items-center space-x-1">
          <Server className="w-3 h-3" />
          <span>Port: 5000</span>
        </div>
        <span>•</span>
        <div className="flex items-center space-x-1 text-[10px]">
          <span className={backendConnected ? 'text-status-success' : 'text-status-error'}>●</span>
          <span>{backendConnected ? 'Ready' : 'Disconnected'}</span>
        </div>
      </div>
    </footer>
  );
}
