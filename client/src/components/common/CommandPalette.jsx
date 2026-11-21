import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  X
} from 'lucide-react';

const commands = [
  { path: '/dashboard', label: 'Go to Dashboard', group: 'Navigation', icon: LayoutDashboard },
  { path: '/client', label: 'Open API Client (Send Requests)', group: 'Navigation', icon: Send },
  { path: '/mock-server', label: 'Manage Mock API Server & Endpoints', group: 'Navigation', icon: Boxes },
  { path: '/demo-api', label: 'Explore Student CRUD Demo API', group: 'Navigation', icon: Database },
  { path: '/collections', label: 'View Workspaces & Collections', group: 'Navigation', icon: FolderGit2 },
  { path: '/environments', label: 'Configure Environment Variables', group: 'Navigation', icon: Sliders },
  { path: '/test-suites', label: 'Run Automated Test Suites', group: 'Navigation', icon: CheckCircle2 },
  { path: '/runner', label: 'Open Collection Runner', group: 'Navigation', icon: PlaySquare },
  { path: '/history', label: 'Inspect Execution History', group: 'Navigation', icon: History },
  { path: '/analytics', label: 'View API Analytics & Metrics', group: 'Navigation', icon: BarChart3 },
  { path: '/docs', label: 'Open OpenAPI & Swagger Documentation', group: 'Navigation', icon: BookOpen },
  { path: '/settings', label: 'Open Platform Settings', group: 'Navigation', icon: Settings }
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.group.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd) => {
    navigate(cmd.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-bg-primary border border-bg-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-bg-border space-x-3">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or jump to page..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm focus:outline-none text-[var(--text-primary)] placeholder-muted"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">No commands found matching "{query}"</div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.path}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#7C6CFF]/15 text-[#7C6CFF] border border-[#7C6CFF]/30 font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-bg-elevated hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{cmd.label}</span>
                  </div>
                  <span className="text-[10px] text-muted font-mono">{cmd.group}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-bg-border bg-bg-secondary text-[10px] text-muted">
          <span>Navigate with ↑ / ↓</span>
          <span>Select with Enter</span>
          <span>Close with Esc</span>
        </div>
      </div>
    </div>
  );
}
