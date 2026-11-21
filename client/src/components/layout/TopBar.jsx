import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Search, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../../stores/workspaceStore.js';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/client': 'API Client',
  '/mock-server': 'Mock API Server',
  '/demo-api': 'Demonstration CRUD API (Students)',
  '/collections': 'Workspaces & Collections',
  '/environments': 'Environment Variables',
  '/test-suites': 'Automated Test Suites',
  '/runner': 'Collection Runner',
  '/history': 'Request History',
  '/analytics': 'API Analytics & Performance',
  '/docs': 'OpenAPI Documentation',
  '/settings': 'System Settings'
};

export default function TopBar({ onOpenCommandPalette }) {
  const location = useLocation();
  const { theme, toggleTheme, environments, activeEnvironmentId, setActiveEnvironmentId, backendConnected } =
    useAppStore();

  const title = routeTitles[location.pathname] || 'API FORGE';

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-bg-sidebar border-b border-bg-border select-none z-10">
      {/* Breadcrumb / Title */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-muted">Platform</span>
        <span className="text-xs text-muted">/</span>
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
      </div>

      {/* Controls: Command Palette, Environment, Health, Theme */}
      <div className="flex items-center space-x-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-bg-primary border border-bg-border text-xs text-muted hover:text-[var(--text-primary)] hover:border-[#7C6CFF]/50 transition-colors"
          title="Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search / Jump</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-bg-elevated rounded border border-bg-border font-mono">
            Ctrl+K
          </kbd>
        </button>

        {/* Environment Selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-muted hidden md:inline">Env:</span>
          <select
            value={activeEnvironmentId || ''}
            onChange={(e) => setActiveEnvironmentId(e.target.value)}
            className="bg-bg-primary border border-bg-border text-xs rounded px-2 py-1 focus:outline-none focus:border-[#7C6CFF] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        {/* Live Backend Connection Status */}
        <div
          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-mono border ${
            backendConnected
              ? 'text-status-success bg-status-success/10 border-status-success/30'
              : 'text-status-error bg-status-error/10 border-status-error/30'
          }`}
          title={backendConnected ? 'Backend service online (127.0.0.1:5000)' : 'Backend unreachable'}
        >
          {backendConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="text-[10px] hidden sm:inline">{backendConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded bg-bg-primary border border-bg-border text-muted hover:text-[var(--text-primary)] transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7C6CFF]" />}
        </button>
      </div>
    </header>
  );
}
