import { create } from 'zustand';

const initialTab = {
  id: 'tab-default',
  requestId: null,
  name: 'Untitled Request',
  method: 'GET',
  urlTemplate: 'http://127.0.0.1:5000/demo/v1/students',
  headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
  queryParams: [],
  bodyType: 'none',
  bodyTemplate: '',
  auth: { type: 'none' },
  settings: { timeoutMs: 15000 },
  assertions: [],
  isDirty: false
};

export const useAppStore = create((set, get) => ({
  // Workspace & Environment
  workspaces: [],
  activeWorkspaceId: 'ws-demo-lab',
  environments: [],
  activeEnvironmentId: 'env-local',
  backendConnected: false,

  // Theme: 'dark' or 'light'
  theme: localStorage.getItem('apiforge_theme') || 'dark',

  // Sidebar
  isSidebarCollapsed: false,

  // Request Tabs
  tabs: [initialTab],
  activeTabId: 'tab-default',

  // Actions
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setEnvironments: (environments) => set({ environments }),
  setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id }),
  setBackendConnected: (status) => set({ backendConnected: status }),

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('apiforge_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    set({ theme: nextTheme });
  },

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Request Tab Management
  createTab: (customData = {}) => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      ...initialTab,
      id: newId,
      name: customData.name || 'New Request',
      ...customData
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newId
    }));
    return newId;
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      // Don't close the last tab, reset it
      set({ tabs: [{ ...initialTab, id: `tab-${Date.now()}` }] });
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActive = activeTabId;
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      const newIdx = Math.max(0, idx - 1);
      nextActive = filtered[newIdx].id;
    }

    set({ tabs: filtered, activeTabId: nextActive });
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  updateActiveTab: (updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId ? { ...tab, ...updates, isDirty: true } : tab
      )
    }));
  },

  duplicateActiveTab: () => {
    const { tabs, activeTabId } = get();
    const current = tabs.find((t) => t.id === activeTabId);
    if (!current) return;

    const newId = `tab-${Date.now()}`;
    const duplicate = {
      ...current,
      id: newId,
      name: `${current.name} (Copy)`
    };

    set((state) => ({
      tabs: [...state.tabs, duplicate],
      activeTabId: newId
    }));
  }
}));
