-- API FORGE Database Schema Migration 001
-- Enables foreign keys, creates 17 relational tables and performance indexes

PRAGMA foreign_keys = ON;

-- 1. Schema Migrations Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  mock_service_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- 3. Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);

-- 4. Folders
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  parent_folder_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_collection ON folders(collection_id);

-- 5. Saved Requests
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  folder_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
  url_template TEXT NOT NULL,
  headers_json TEXT NOT NULL DEFAULT '[]',
  query_params_json TEXT NOT NULL DEFAULT '[]',
  body_type TEXT NOT NULL DEFAULT 'none' CHECK (body_type IN ('none', 'json', 'text', 'urlencoded')),
  body_template TEXT,
  auth_configuration_json TEXT NOT NULL DEFAULT '{"type":"none"}',
  request_settings_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);
CREATE INDEX IF NOT EXISTS idx_requests_folder ON requests(folder_id);

-- 6. Environments
CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_environments_workspace ON environments(workspace_id);

-- 7. Environment Variables
CREATE TABLE IF NOT EXISTS environment_variables (
  id TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL,
  variable_key TEXT NOT NULL,
  variable_value TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
  UNIQUE(environment_id, variable_key)
);

CREATE INDEX IF NOT EXISTS idx_env_vars_env ON environment_variables(environment_id);

-- 8. Mock Endpoints
CREATE TABLE IF NOT EXISTS mock_endpoints (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
  endpoint_path TEXT NOT NULL,
  response_status INTEGER NOT NULL DEFAULT 200,
  response_headers_json TEXT NOT NULL DEFAULT '{"Content-Type": "application/json"}',
  response_body TEXT NOT NULL DEFAULT '{}',
  content_type TEXT NOT NULL DEFAULT 'application/json',
  delay_ms INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, method, endpoint_path)
);

CREATE INDEX IF NOT EXISTS idx_mock_endpoints_workspace ON mock_endpoints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mock_lookup ON mock_endpoints(workspace_id, method, endpoint_path, is_enabled);

-- 9. Test Suites
CREATE TABLE IF NOT EXISTS test_suites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_suites_workspace ON test_suites(workspace_id);

-- 10. Test Suite Requests (Mapping)
CREATE TABLE IF NOT EXISTS test_suite_requests (
  id TEXT PRIMARY KEY,
  test_suite_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  execution_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (test_suite_id) REFERENCES test_suites(id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ts_requests_suite ON test_suite_requests(test_suite_id);

-- 11. Test Cases (Declarative Assertions attached to requests)
CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  name TEXT NOT NULL,
  assertion_type TEXT NOT NULL,
  assertion_target TEXT,
  expected_value_json TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_cases_request ON test_cases(request_id);

-- 12. Test Runs
CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  test_suite_id TEXT,
  workspace_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  completed_at TEXT,
  total_assertions INTEGER NOT NULL DEFAULT 0,
  passed_assertions INTEGER NOT NULL DEFAULT 0,
  failed_assertions INTEGER NOT NULL DEFAULT 0,
  skipped_assertions INTEGER NOT NULL DEFAULT 0,
  execution_status TEXT NOT NULL DEFAULT 'running' CHECK (execution_status IN ('running', 'passed', 'failed', 'cancelled', 'error')),
  FOREIGN KEY (test_suite_id) REFERENCES test_suites(id) ON DELETE SET NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_runs_workspace ON test_runs(workspace_id);

-- 13. Test Results
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  test_run_id TEXT NOT NULL,
  test_case_id TEXT,
  assertion_name_snapshot TEXT NOT NULL,
  result_status TEXT NOT NULL CHECK (result_status IN ('passed', 'failed', 'skipped', 'error')),
  expected_value_sanitized TEXT,
  actual_value_sanitized TEXT,
  failure_message_sanitized TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(test_run_id);

-- 14. Request Execution History
CREATE TABLE IF NOT EXISTS request_history (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  request_id TEXT,
  collection_id TEXT,
  method TEXT NOT NULL,
  sanitized_url TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms REAL NOT NULL,
  response_size_bytes INTEGER NOT NULL DEFAULT 0,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'http_error', 'transport_error', 'timeout', 'cancelled')),
  request_source TEXT NOT NULL DEFAULT 'client' CHECK (request_source IN ('client', 'collection_runner', 'test_suite')),
  error_category TEXT,
  passed_assertions INTEGER NOT NULL DEFAULT 0,
  failed_assertions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_history_workspace ON request_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON request_history(created_at);
CREATE INDEX IF NOT EXISTS idx_history_method ON request_history(method);
CREATE INDEX IF NOT EXISTS idx_history_status ON request_history(status_code);

-- 15. Mock Activity Log
CREATE TABLE IF NOT EXISTS mock_activity (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  mock_endpoint_id TEXT,
  method TEXT NOT NULL,
  sanitized_path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (mock_endpoint_id) REFERENCES mock_endpoints(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_activity_workspace ON mock_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mock_activity_created ON mock_activity(created_at);

-- 16. Students (Demonstration CRUD API)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1 AND year <= 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- 17. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
