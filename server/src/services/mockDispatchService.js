import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';
import { appEvents, EVENT_TYPES } from '../events/appEventEmitter.js';

/**
 * Dynamic Mock Endpoint Dispatcher.
 * Resolves incoming HTTP requests on `/mock/:workspaceSlug/*` against configured mock endpoints.
 * Non-blocking delay, customizable headers, status codes, and mock activity logging.
 */
export async function handleMockDispatch(req, res, next) {
  const { workspaceSlug } = req.params;
  // Get remainder path after /mock/:workspaceSlug
  const fullPrefix = `/mock/${workspaceSlug}`;
  let relativePath = req.originalUrl.substring(fullPrefix.length).split('?')[0];
  if (!relativePath.startsWith('/')) {
    relativePath = `/${relativePath}`;
  }

  const method = req.method.toUpperCase();
  const db = getDatabase();

  // 1. Look up workspace
  const workspace = db.prepare(`
    SELECT id, slug, mock_service_enabled
    FROM workspaces
    WHERE slug = ?
  `).get(workspaceSlug);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'WORKSPACE_NOT_FOUND',
        message: `Mock workspace "${workspaceSlug}" does not exist.`
      }
    });
  }

  if (workspace.mock_service_enabled === 0) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'MOCK_SERVICE_DISABLED',
        message: `Mock server is currently disabled for workspace "${workspaceSlug}".`
      }
    });
  }

  // 2. Find matching mock endpoint
  // Exact path match first
  const endpoint = db.prepare(`
    SELECT *
    FROM mock_endpoints
    WHERE workspace_id = ? AND method = ? AND endpoint_path = ? AND is_enabled = 1
  `).get(workspace.id, method, relativePath);

  if (!endpoint) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'MOCK_ENDPOINT_NOT_FOUND',
        message: `No active mock endpoint found for ${method} ${relativePath} in workspace "${workspaceSlug}".`
      }
    });
  }

  const start = performance.now();

  // 3. Non-blocking delay simulation
  const delayMs = Math.min(Math.max(Number(endpoint.delay_ms || 0), 0), 10000);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 4. Parse headers
  let customHeaders = {};
  try {
    customHeaders = JSON.parse(endpoint.response_headers_json || '{}');
  } catch {
    customHeaders = { 'Content-Type': 'application/json' };
  }

  // Set response headers
  for (const [key, val] of Object.entries(customHeaders)) {
    try {
      res.setHeader(key, val);
    } catch {
      // Ignore invalid header format
    }
  }

  // 5. Log activity safely (ignore if server shutting down)
  try {
    const durationMs = performance.now() - start;
    const activityId = `mockact-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO mock_activity (
        id, workspace_id, mock_endpoint_id, method, sanitized_path,
        status_code, response_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'utc'))
    `).run(
      activityId,
      workspace.id,
      endpoint.id,
      method,
      relativePath,
      endpoint.response_status,
      durationMs
    );

    appEvents.emit(EVENT_TYPES.MOCK_CALLED, {
      workspaceId: workspace.id,
      endpointId: endpoint.id,
      method,
      path: relativePath,
      status: endpoint.response_status
    });
  } catch {
    // Database may be closed during rapid test teardown
  }

  // 6. Handle 204 / 304 / HEAD responses that must have no body
  if (endpoint.response_status === 204 || endpoint.response_status === 304 || method === 'HEAD') {
    return res.status(endpoint.response_status).end();
  }

  // Return configured body
  res.status(endpoint.response_status);
  if (endpoint.content_type?.includes('application/json')) {
    try {
      const parsed = JSON.parse(endpoint.response_body);
      return res.json(parsed);
    } catch {
      return res.send(endpoint.response_body);
    }
  }

  return res.send(endpoint.response_body);
}
