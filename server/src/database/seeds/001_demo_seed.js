import { getDatabase } from '../connection.js';
import { runMigrations } from '../migrationRunner.js';
import { config } from '../../config/index.js';

export function seedDemoData(customDb = null) {
  const db = customDb || getDatabase();
  runMigrations(db);

  console.log('[Database Seed] Seeding demo data...');

  const now = new Date().toISOString();

  // 1. Workspace: "API FORGE Demo Lab"
  const workspaceId = 'ws-demo-lab';
  const workspaceSlug = 'demo';
  const existingWs = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(workspaceId);

  if (!existingWs) {
    db.prepare(`
      INSERT INTO workspaces (id, name, slug, description, mock_service_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      workspaceId,
      'API FORGE Demo Lab',
      workspaceSlug,
      'Preconfigured demonstration workspace with student REST API, mock services, and automated tests.',
      1,
      now,
      now
    );
  }

  // 2. Demonstration Students in `students` table
  const sampleStudents = [
    { id: 1, name: 'Alice Johnson', email: 'alice.johnson@university.edu', department: 'Computer Science', year: 3 },
    { id: 2, name: 'Bob Smith', email: 'bob.smith@university.edu', department: 'Information Technology', year: 2 },
    { id: 3, name: 'Charlie Brown', email: 'charlie.brown@university.edu', department: 'Electronics & Comm', year: 4 },
    { id: 4, name: 'Diana Prince', email: 'diana.prince@university.edu', department: 'Computer Science', year: 1 },
    { id: 5, name: 'Evan Wright', email: 'evan.wright@university.edu', department: 'Mechanical Engineering', year: 3 }
  ];

  for (const s of sampleStudents) {
    const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(s.email);
    if (!existing) {
      db.prepare(`
        INSERT INTO students (id, name, email, department, year, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(s.id, s.name, s.email, s.department, s.year, now, now);
    }
  }

  // 3. Environment: Local Development
  const envId = 'env-local';
  const existingEnv = db.prepare('SELECT id FROM environments WHERE id = ?').get(envId);
  if (!existingEnv) {
    db.prepare(`
      INSERT INTO environments (id, workspace_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(envId, workspaceId, 'Local Development', now, now);

    const defaultBaseUrl = config.serverUrl || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:5000');
    const envVars = [
      { key: 'base_url', value: defaultBaseUrl, isSecret: 0 },
      { key: 'api_version', value: 'v1', isSecret: 0 },
      { key: 'student_id', value: '1', isSecret: 0 },
      { key: 'demo_token', value: 'forge-dev-token-xyz987', isSecret: 1 }
    ];

    for (const v of envVars) {
      db.prepare(`
        INSERT OR IGNORE INTO environment_variables (id, environment_id, variable_key, variable_value, is_secret, is_enabled)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(`var-${v.key}`, envId, v.key, v.value, v.isSecret);
    }
  }

  // 4. Mock Endpoints for Demo Lab
  const mockEndpoints = [
    {
      id: 'mock-get-users',
      name: 'List Mock Users',
      description: 'Returns mock user list',
      method: 'GET',
      path: '/users',
      status: 200,
      headers: JSON.stringify({ 'Content-Type': 'application/json', 'X-Mock-Engine': 'API-FORGE' }),
      body: JSON.stringify({
        success: true,
        count: 2,
        users: [
          { id: 101, username: 'neo', role: 'admin' },
          { id: 102, username: 'trinity', role: 'developer' }
        ]
      }, null, 2),
      delay: 50
    },
    {
      id: 'mock-post-orders',
      name: 'Create Order Mock',
      description: 'Simulates creation of an order',
      method: 'POST',
      path: '/orders',
      status: 201,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        success: true,
        orderId: 'ORD-98421',
        status: 'placed',
        estimatedDelivery: '2 business days'
      }, null, 2),
      delay: 80
    },
    {
      id: 'mock-unauth',
      name: 'Unauthorized Resource',
      description: 'Simulates 401 Unauthorized',
      method: 'GET',
      path: '/secure-data',
      status: 401,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token' }
      }, null, 2),
      delay: 20
    },
    {
      id: 'mock-not-found',
      name: 'Resource Not Found',
      description: 'Simulates 404 Not Found',
      method: 'GET',
      path: '/missing-item',
      status: 404,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Requested item does not exist in inventory' }
      }, null, 2),
      delay: 30
    },
    {
      id: 'mock-server-error',
      name: 'Faulty Service',
      description: 'Simulates 500 Internal Server Error',
      method: 'GET',
      path: '/faulty-service',
      status: 500,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Upstream database connection pool exhausted' }
      }, null, 2),
      delay: 100
    },
    {
      id: 'mock-slow',
      name: 'Delayed Endpoint',
      description: 'Simulates high latency response (250ms)',
      method: 'GET',
      path: '/slow-endpoint',
      status: 200,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: 'This response was intentionally delayed by 250ms to demonstrate latency measurement.'
      }, null, 2),
      delay: 250
    }
  ];

  for (const m of mockEndpoints) {
    const existing = db.prepare('SELECT id FROM mock_endpoints WHERE id = ?').get(m.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO mock_endpoints (
          id, workspace_id, name, description, method, endpoint_path, response_status,
          response_headers_json, response_body, content_type, delay_ms, is_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        m.id, workspaceId, m.name, m.description, m.method, m.path, m.status,
        m.headers, m.body, 'application/json', m.delay, now, now
      );
    }
  }

  // 5. Collections
  // Collection A: Student Management API
  const colStudentsId = 'col-students';
  if (!db.prepare('SELECT id FROM collections WHERE id = ?').get(colStudentsId)) {
    db.prepare(`
      INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(colStudentsId, workspaceId, 'Student Management API', 'Real CRUD operations on SQLite persistent database', now, now);

    const studentRequests = [
      {
        id: 'req-get-all-students',
        name: 'Get All Students',
        method: 'GET',
        url: '{{base_url}}/demo/{{api_version}}/students',
        bodyType: 'none',
        bodyTemplate: null,
        order: 1
      },
      {
        id: 'req-get-student-by-id',
        name: 'Get Student by ID',
        method: 'GET',
        url: '{{base_url}}/demo/{{api_version}}/students/{{student_id}}',
        bodyType: 'none',
        bodyTemplate: null,
        order: 2
      },
      {
        id: 'req-post-student',
        name: 'Create Student',
        method: 'POST',
        url: '{{base_url}}/demo/{{api_version}}/students',
        bodyType: 'json',
        bodyTemplate: JSON.stringify({
          name: 'Franklin Saint',
          email: 'franklin.saint@university.edu',
          department: 'Business Administration',
          year: 2
        }, null, 2),
        order: 3
      },
      {
        id: 'req-put-student',
        name: 'Replace Student',
        method: 'PUT',
        url: '{{base_url}}/demo/{{api_version}}/students/1',
        bodyType: 'json',
        bodyTemplate: JSON.stringify({
          name: 'Alice Johnson Updated',
          email: 'alice.johnson@university.edu',
          department: 'Computer Science & AI',
          year: 4
        }, null, 2),
        order: 4
      },
      {
        id: 'req-patch-student',
        name: 'Update Student Department',
        method: 'PATCH',
        url: '{{base_url}}/demo/{{api_version}}/students/2',
        bodyType: 'json',
        bodyTemplate: JSON.stringify({
          department: 'Data Science'
        }, null, 2),
        order: 5
      },
      {
        id: 'req-delete-student',
        name: 'Delete Student',
        method: 'DELETE',
        url: '{{base_url}}/demo/{{api_version}}/students/5',
        bodyType: 'none',
        bodyTemplate: null,
        order: 6
      },
      {
        id: 'req-invalid-student',
        name: 'Invalid Student Lookup',
        method: 'GET',
        url: '{{base_url}}/demo/{{api_version}}/students/99999',
        bodyType: 'none',
        bodyTemplate: null,
        order: 7
      },
      {
        id: 'req-duplicate-email',
        name: 'Duplicate Email Validation',
        method: 'POST',
        url: '{{base_url}}/demo/{{api_version}}/students',
        bodyType: 'json',
        bodyTemplate: JSON.stringify({
          name: 'Copycat',
          email: 'alice.johnson@university.edu',
          department: 'Math',
          year: 1
        }, null, 2),
        order: 8
      }
    ];

    for (const req of studentRequests) {
      db.prepare(`
        INSERT INTO requests (
          id, collection_id, folder_id, name, description, method, url_template,
          headers_json, query_params_json, body_type, body_template, auth_configuration_json,
          request_settings_json, sort_order, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.id, colStudentsId, req.name, 'Demonstration CRUD endpoint', req.method, req.url,
        JSON.stringify([{ key: 'Content-Type', value: 'application/json', enabled: true }]),
        JSON.stringify([]), req.bodyType, req.bodyTemplate,
        JSON.stringify({ type: 'none' }),
        JSON.stringify({ timeoutMs: 15000 }),
        req.order, now, now
      );
    }
  }

  // Collection B: Mock API Playground
  const colMocksId = 'col-mocks';
  if (!db.prepare('SELECT id FROM collections WHERE id = ?').get(colMocksId)) {
    db.prepare(`
      INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(colMocksId, workspaceId, 'Mock API Playground', 'Requests calling locally hosted mock server endpoints', now, now);

    const mockRequests = [
      { id: 'req-mock-users', name: 'Get Mock Users', method: 'GET', url: '{{base_url}}/mock/demo/users', order: 1 },
      { id: 'req-mock-order', name: 'Create Mock Order', method: 'POST', url: '{{base_url}}/mock/demo/orders', order: 2 },
      { id: 'req-mock-auth', name: 'Test Unauthorized Endpoint', method: 'GET', url: '{{base_url}}/mock/demo/secure-data', order: 3 },
      { id: 'req-mock-missing', name: 'Test Not Found Endpoint', method: 'GET', url: '{{base_url}}/mock/demo/missing-item', order: 4 },
      { id: 'req-mock-err', name: 'Test Server Error Endpoint', method: 'GET', url: '{{base_url}}/mock/demo/faulty-service', order: 5 },
      { id: 'req-mock-delay', name: 'Test Delayed Response', method: 'GET', url: '{{base_url}}/mock/demo/slow-endpoint', order: 6 }
    ];

    for (const req of mockRequests) {
      db.prepare(`
        INSERT INTO requests (
          id, collection_id, folder_id, name, description, method, url_template,
          headers_json, query_params_json, body_type, body_template, auth_configuration_json,
          request_settings_json, sort_order, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.id, colMocksId, req.name, 'Mock test request', req.method, req.url,
        JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
        JSON.stringify([]), 'none', null,
        JSON.stringify({ type: 'none' }),
        JSON.stringify({ timeoutMs: 15000 }),
        req.order, now, now
      );
    }
  }

  // Collection C: Automated Testing Lab
  const colTestsId = 'col-tests';
  if (!db.prepare('SELECT id FROM collections WHERE id = ?').get(colTestsId)) {
    db.prepare(`
      INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(colTestsId, workspaceId, 'Automated Testing Lab', 'Requests with attached declarative validation assertions', now, now);

    const testReqId = 'req-test-verify-students';
    db.prepare(`
      INSERT INTO requests (
        id, collection_id, folder_id, name, description, method, url_template,
        headers_json, query_params_json, body_type, body_template, auth_configuration_json,
        request_settings_json, sort_order, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testReqId, colTestsId, 'Verify Students API Suite', 'Tests status code, latency, and JSON structure', 'GET',
      '{{base_url}}/demo/{{api_version}}/students',
      JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
      JSON.stringify([]), 'none', null,
      JSON.stringify({ type: 'none' }),
      JSON.stringify({ timeoutMs: 15000 }),
      1, now, now
    );

    // Attach declarative assertions to `req-test-verify-students`
    const assertions = [
      { id: 'tc-status-200', name: 'Status code equals 200', type: 'status_equals', target: null, val: '200' },
      { id: 'tc-time-below-1000', name: 'Response time is below 1000ms', type: 'time_below', target: null, val: '1000' },
      { id: 'tc-json-success', name: 'JSON property success equals true', type: 'json_property_equals', target: 'success', val: 'true' },
      { id: 'tc-json-array', name: 'JSON property data is an array', type: 'json_property_type', target: 'data', val: 'array' },
      { id: 'tc-header-content-type', name: 'Header Content-Type contains application/json', type: 'header_contains', target: 'content-type', val: 'application/json' }
    ];

    for (let i = 0; i < assertions.length; i++) {
      const a = assertions[i];
      db.prepare(`
        INSERT INTO test_cases (
          id, request_id, name, assertion_type, assertion_target, expected_value_json, is_enabled, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(a.id, testReqId, a.name, a.type, a.target, a.val, i + 1, now, now);
    }

    // Also create a Test Suite
    const suiteId = 'suite-demo-core';
    db.prepare(`
      INSERT INTO test_suites (id, workspace_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(suiteId, workspaceId, 'Core Platform Verification Suite', 'End-to-end regression test suite', now, now);

    db.prepare(`
      INSERT INTO test_suite_requests (id, test_suite_id, request_id, execution_order)
      VALUES (?, ?, ?, 1)
    `).run('tsr-1', suiteId, testReqId);
  }

  // 6. Default App Settings
  const defaultSettings = [
    { key: 'theme', val: { theme: 'dark' } },
    { key: 'editor', val: { fontSize: 13, wordWrap: 'on' } },
    { key: 'requestDefaults', val: { timeoutMs: 15000, defaultView: 'pretty' } },
    { key: 'security', val: { allowPublicApiRequests: false, strictHostValidation: true } }
  ];

  for (const s of defaultSettings) {
    db.prepare(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value_json, updated_at)
      VALUES (?, ?, ?)
    `).run(s.key, JSON.stringify(s.val), now);
  }

  console.log('[Database Seed] Seeding completed successfully.');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('001_demo_seed.js')) {
  try {
    seedDemoData();
    process.exit(0);
  } catch (err) {
    console.error('[Database Seed Error]:', err);
    process.exit(1);
  }
}
