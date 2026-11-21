import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Boxes,
  Database,
  FolderGit2,
  Sliders,
  CheckCircle2,
  PlaySquare,
  History,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { useAppStore } from '../../stores/workspaceStore.js';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/client', label: 'API Client', icon: Send },
  { path: '/mock-server', label: 'Mock Server', icon: Boxes },
  { path: '/demo-api', label: 'Demo CRUD API', icon: Database },
  { path: '/collections', label: 'Collections', icon: FolderGit2 },
  { path: '/environments', label: 'Environments', icon: Sliders },
  { path: '/test-suites', label: 'Test Suites', icon: CheckCircle2 },
  { path: '/runner', label: 'Collection Runner', icon: PlaySquare },
  { path: '/history', label: 'History', icon: History },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/docs', label: 'Documentation', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar, workspaces, activeWorkspaceId, setActiveWorkspaceId } = useAppStore();

  return (
    <aside
      className={`flex flex-col h-full bg-bg-sidebar border-r border-bg-border transition-all duration-200 select-none z-20 ${
        isSidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-bg-border">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C6CFF]/15 border border-[#7C6CFF]/30 text-[#7C6CFF] flex-shrink-0">
            <Flame className="w-5 h-5 text-[#7C6CFF]" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-[#F1F3F7] to-[#7C6CFF] bg-clip-text text-transparent">
                API FORGE
              </span>
              <span className="text-[10px] text-muted tracking-widest uppercase">Dev Platform</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated transition-colors"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className="px-2.5 py-2.5 border-b border-bg-border">
        {!isSidebarCollapsed ? (
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-semibold tracking-wider uppercase text-muted">Workspace</label>
            <select
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              className="w-full bg-bg-primary border border-bg-border text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#7C6CFF] text-[var(--text-primary)] cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex justify-center" title="API FORGE Demo Lab">
            <span className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-xs font-bold text-[#7C6CFF]">
              WS
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#7C6CFF]/15 text-[#7C6CFF] border border-[#7C6CFF]/30 font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-bg-elevated hover:text-[var(--text-primary)]'
                }`
              }
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-2 border-t border-bg-border text-[11px] text-muted flex items-center justify-between">
        {!isSidebarCollapsed ? (
          <>
            <span>v1.0.0 LTS</span>
            <span className="text-[#26C6DA] font-mono">Node v24</span>
          </>
        ) : (
          <div className="w-full text-center font-mono text-[10px]">v1.0</div>
        )}
      </div>
    </aside>
  );
}
