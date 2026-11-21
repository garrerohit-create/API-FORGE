const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

export const api = {
  // System & Health
  getHealth: () => request('/health'),
  getSystemInfo: () => request('/system/info'),

  // Workspaces
  getWorkspaces: () => request('/workspaces'),
  createWorkspace: (data) => request('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkspace: (id, data) => request(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWorkspace: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),

  // Collections
  getCollections: (workspaceId) => request(`/workspaces/${workspaceId}/collections`),
  getCollection: (id) => request(`/collections/${id}`),
  createCollection: (workspaceId, data) => request(`/workspaces/${workspaceId}/collections`, { method: 'POST', body: JSON.stringify(data) }),
  updateCollection: (id, data) => request(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),

  // Folders
  getFolders: (collectionId) => request(`/collections/${collectionId}/folders`),
  createFolder: (collectionId, data) => request(`/collections/${collectionId}/folders`, { method: 'POST', body: JSON.stringify(data) }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

  // Saved Requests
  getRequests: (collectionId) => request(`/collections/${collectionId}/requests`),
  getRequest: (id) => request(`/requests/${id}`),
  createRequest: (collectionId, data) => request(`/collections/${collectionId}/requests`, { method: 'POST', body: JSON.stringify(data) }),
  updateRequest: (id, data) => request(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

  // Execution Engine
  executeRequest: (data) => request('/executions', { method: 'POST', body: JSON.stringify(data) }),
  cancelExecution: (id) => request(`/executions/${id}`, { method: 'DELETE' }),

  // Mock Endpoints
  getMockEndpoints: (workspaceId) => request(`/workspaces/${workspaceId}/mock-endpoints`),
  createMockEndpoint: (workspaceId, data) => request(`/workspaces/${workspaceId}/mock-endpoints`, { method: 'POST', body: JSON.stringify(data) }),
  updateMockEndpoint: (id, data) => request(`/mock-endpoints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMockEndpoint: (id) => request(`/mock-endpoints/${id}`, { method: 'DELETE' }),
  getMockActivity: (workspaceId) => request(`/workspaces/${workspaceId}/mock-activity`),

  // Environments
  getEnvironments: (workspaceId) => request(`/workspaces/${workspaceId}/environments`),
  createEnvironment: (workspaceId, data) => request(`/workspaces/${workspaceId}/environments`, { method: 'POST', body: JSON.stringify(data) }),
  updateEnvironment: (id, data) => request(`/environments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setSessionSecrets: (id, secrets) => request(`/environments/${id}/secrets`, { method: 'PUT', body: JSON.stringify({ secrets }) }),
  deleteEnvironment: (id) => request(`/environments/${id}`, { method: 'DELETE' }),

  // Test Suites & Cases
  getTestCases: (requestId) => request(`/requests/${requestId}/test-cases`),
  createTestCase: (requestId, data) => request(`/requests/${requestId}/test-cases`, { method: 'POST', body: JSON.stringify(data) }),
  updateTestCase: (id, data) => request(`/test-cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTestCase: (id) => request(`/test-cases/${id}`, { method: 'DELETE' }),

  getTestSuites: (workspaceId) => request(`/workspaces/${workspaceId}/test-suites`),
  createTestSuite: (workspaceId, data) => request(`/workspaces/${workspaceId}/test-suites`, { method: 'POST', body: JSON.stringify(data) }),
  runTestSuite: (id, data) => request(`/test-suites/${id}/run`, { method: 'POST', body: JSON.stringify(data) }),
  getTestRun: (id) => request(`/test-runs/${id}`),

  // Collection Runner
  runCollection: (collectionId, data) => request(`/collections/${collectionId}/run`, { method: 'POST', body: JSON.stringify(data) }),

  // Analytics & History
  getAnalytics: (workspaceId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/workspaces/${workspaceId}/analytics${qs ? `?${qs}` : ''}`);
  },
  getHistory: (workspaceId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/workspaces/${workspaceId}/history${qs ? `?${qs}` : ''}`);
  },
  deleteHistoryItem: (id) => request(`/history/${id}`, { method: 'DELETE' }),
  clearHistory: (workspaceId) => request(`/workspaces/${workspaceId}/history`, { method: 'DELETE' }),

  // Documentation & Migration
  getOpenApiSpec: (workspaceId) => request(`/workspaces/${workspaceId}/openapi`),
  getDocsMarkdown: (workspaceId) => fetch(`${API_BASE}/workspaces/${workspaceId}/docs/markdown`).then((r) => r.text()),
  exportCollection: (id) => request(`/collections/${id}/export`),
  importCollection: (workspaceId, data, format = 'auto') =>
    request(`/workspaces/${workspaceId}/import`, { method: 'POST', body: JSON.stringify({ data, format }) }),

  // Settings
  getSettings: () => request('/settings'),
  updateSetting: (key, value) => request('/settings', { method: 'PATCH', body: JSON.stringify({ key, value }) }),
  resetDemoData: () => request('/settings/reset-demo', { method: 'POST' }),

  // Demonstration Students CRUD API
  getStudents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`/demo/v1/students${qs ? `?${qs}` : ''}`).then((r) => r.json());
  },
  createStudent: (data) =>
    fetch('/demo/v1/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then((r) => r.json()),
  updateStudent: (id, data) =>
    fetch(`/demo/v1/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then((r) => r.json()),
  deleteStudent: (id) => fetch(`/demo/v1/students/${id}`, { method: 'DELETE' }),

  // Code Generation
  generateCodeSnippets: (data) => request('/codegen/snippets', { method: 'POST', body: JSON.stringify(data) })
};
