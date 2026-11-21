# API FORGE — REST API Reference

All management endpoints are prefixed with `/api/v1`.  
Demonstration CRUD endpoints are prefixed with `/demo/v1`.  
Mock endpoints are served under `/mock/:workspaceSlug/*`.

---

## 1. System & Health

### `GET /api/v1/health`
Checks backend and database health.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-21T18:00:00.000Z",
    "uptimeSeconds": 142,
    "database": "ok",
    "version": "1.0.0"
  }
  ```

### `GET /api/v1/system/info`
Returns runtime information including Node.js version, platform, memory usage, and configured limits.

---

## 2. Workspaces

- `GET /api/v1/workspaces`: List all workspaces.
- `POST /api/v1/workspaces`: Create a workspace `{ name, slug, description }`.
- `GET /api/v1/workspaces/:id`: Retrieve workspace by ID.
- `PATCH /api/v1/workspaces/:id`: Update workspace properties or toggle `mock_service_enabled`.
- `DELETE /api/v1/workspaces/:id`: Delete a workspace (demo workspace is protected).

---

## 3. Collections & Saved Requests

- `GET /api/v1/workspaces/:workspaceId/collections`: List collections with request counts.
- `POST /api/v1/workspaces/:workspaceId/collections`: Create collection `{ name, description }`.
- `GET /api/v1/collections/:id`: Get collection with folders and saved requests.
- `PATCH /api/v1/collections/:id`: Update collection details.
- `DELETE /api/v1/collections/:id`: Delete collection and nested requests.
- `POST /api/v1/collections/:collectionId/requests`: Save a new request.
- `GET /api/v1/requests/:id`: Retrieve saved request details and test cases.
- `PATCH /api/v1/requests/:id`: Update saved request configuration.
- `DELETE /api/v1/requests/:id`: Remove saved request.

---

## 4. Request Execution Engine

### `POST /api/v1/executions`
Executes an outbound HTTP request.
- **Request Body**:
  ```json
  {
    "workspaceId": "ws-demo-lab",
    "environmentId": "env-local",
    "method": "GET",
    "urlTemplate": "{{base_url}}/demo/v1/students",
    "headers": [{ "key": "Accept", "value": "application/json", "enabled": true }],
    "queryParams": [{ "key": "page", "value": "1", "enabled": true }],
    "bodyType": "none",
    "assertions": [
      { "name": "Status is 200", "assertion_type": "status_equals", "expected_value_json": "200" }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "executionId": "exec-abc123",
      "status": 200,
      "statusText": "OK",
      "durationMs": 14.2,
      "sizeBytes": 512,
      "headers": { "content-type": "application/json" },
      "body": { "success": true, "data": [] },
      "assertions": { "total": 1, "passed": 1, "failed": 0, "results": [...] }
    }
  }
  ```

### `DELETE /api/v1/executions/:id`
Cancels an active running request execution.

---

## 5. Mock Endpoints & Mock Server

- `GET /api/v1/workspaces/:workspaceId/mock-endpoints`: List mock endpoints.
- `POST /api/v1/workspaces/:workspaceId/mock-endpoints`: Create mock route `{ name, method, endpoint_path, response_status, response_body, delay_ms }`.
- `PATCH /api/v1/mock-endpoints/:id`: Update mock route configuration.
- `DELETE /api/v1/mock-endpoints/:id`: Remove mock endpoint.
- `GET /api/v1/workspaces/:workspaceId/mock-activity`: Retrieve recent mock activity logs.
- `ALL /mock/:workspaceSlug/*`: Dynamic mock dispatcher endpoint.

---

## 6. Environments & Variables

- `GET /api/v1/workspaces/:workspaceId/environments`: List environments with masked secret values.
- `POST /api/v1/workspaces/:workspaceId/environments`: Create environment `{ name, variables }`.
- `PATCH /api/v1/environments/:id`: Update environment variables.
- `PUT /api/v1/environments/:id/secrets`: Store session secrets in process memory `{ secrets: { token: "..." } }`.
- `DELETE /api/v1/environments/:id`: Delete environment and associated secrets.

---

## 7. Automated Test Suites & Runner

- `GET /api/v1/requests/:requestId/test-cases`: List declarative assertions for request.
- `POST /api/v1/requests/:requestId/test-cases`: Add assertion.
- `GET /api/v1/workspaces/:workspaceId/test-suites`: List test suites.
- `POST /api/v1/test-suites/:id/run`: Execute complete test suite.
- `POST /api/v1/collections/:id/run`: Run collection sequentially `{ iterations: 1 }`.
- `DELETE /api/v1/collection-runs/:id`: Cancel active collection run.

---

## 8. Demonstration Student Management API (`/demo/v1/students`)

- `GET /demo/v1/students`: List students with query filters (`department`, `search`, `page`, `limit`).
- `GET /demo/v1/students/:id`: Get student by ID (`200 OK` or `404 Not Found`).
- `POST /demo/v1/students`: Create student `{ name, email, department, year }` (`201 Created` or `409 Conflict`).
- `PUT /demo/v1/students/:id`: Replace student record (`200 OK`, `404 Not Found`, or `409 Conflict`).
- `PATCH /demo/v1/students/:id`: Partial student update (`200 OK` or `404 Not Found`).
- `DELETE /demo/v1/students/:id`: Remove student (`204 No Content` or `404 Not Found`).
- `POST /api/v1/settings/reset-demo`: Reset demonstration records to default seeds.
