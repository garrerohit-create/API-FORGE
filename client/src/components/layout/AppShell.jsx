import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import StatusBar from './StatusBar.jsx';
import CommandPalette from '../common/CommandPalette.jsx';

export default function AppShell({ children }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Ctrl+K shortcut for Command Palette
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-main text-[var(--text-primary)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        {/* Dynamic Page Views */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-bg-main">
          {children}
        </main>

        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Quick Jump Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
