import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List mock endpoints for workspace
router.get('/workspaces/:workspaceId/mock-endpoints', (req, res) => {
  const db = getDatabase();
  const endpoints = db.prepare(`
    SELECT *
    FROM mock_endpoints
    WHERE workspace_id = ?
    ORDER BY endpoint_path ASC, method ASC
  `).all(req.params.workspaceId);

  res.json({ success: true, data: endpoints });
});

// Create mock endpoint
router.post('/workspaces/:workspaceId/mock-endpoints', (req, res) => {
  const db = getDatabase();
  const {
    name,
    description,
    method = 'GET',
    endpoint_path,
    response_status = 200,
    response_headers_json,
    response_body = '{}',
    content_type = 'application/json',
    delay_ms = 0,
    is_enabled = 1
  } = req.body;

  if (!name || !endpoint_path) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Mock endpoint name and endpoint_path are required.' }
    });
  }

  let cleanPath = endpoint_path.trim();
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  const upperMethod = method.toUpperCase();

  // Check unique constraint (workspace_id, method, endpoint_path)
  const existing = db.prepare(`
    SELECT id FROM mock_endpoints
    WHERE workspace_id = ? AND method = ? AND endpoint_path = ?
  `).get(req.params.workspaceId, upperMethod, cleanPath);

  if (existing) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'ROUTE_CONFLICT',
        message: `Mock route ${upperMethod} ${cleanPath} already exists in this workspace.`
      }
    });
  }

  const id = `mock-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO mock_endpoints (
      id, workspace_id, name, description, method, endpoint_path, response_status,
      response_headers_json, response_body, content_type, delay_ms, is_enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.workspaceId,
    name,
    description || '',
    upperMethod,
    cleanPath,
    Number(response_status),
    response_headers_json || '{"Content-Type": "application/json"}',
    response_body,
    content_type,
    Math.min(Math.max(Number(delay_ms || 0), 0), 10000),
    is_enabled ? 1 : 0,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM mock_endpoints WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Get single mock endpoint
router.get('/mock-endpoints/:id', (req, res) => {
  const db = getDatabase();
  const ep = db.prepare('SELECT * FROM mock_endpoints WHERE id = ?').get(req.params.id);
  if (!ep) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mock endpoint not found.' } });
  }
  res.json({ success: true, data: ep });
});

// Update mock endpoint
router.patch('/mock-endpoints/:id', (req, res) => {
  const db = getDatabase();
  const ep = db.prepare('SELECT * FROM mock_endpoints WHERE id = ?').get(req.params.id);
  if (!ep) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mock endpoint not found.' } });
  }

  const {
    name,
    description,
    method,
    endpoint_path,
    response_status,
    response_headers_json,
    response_body,
    content_type,
    delay_ms,
    is_enabled
  } = req.body;

  let cleanPath = endpoint_path ? (endpoint_path.startsWith('/') ? endpoint_path : `/${endpoint_path}`) : ep.endpoint_path;
  const cleanMethod = method ? method.toUpperCase() : ep.method;

  if (cleanPath !== ep.endpoint_path || cleanMethod !== ep.method) {
    const conflict = db.prepare(`
      SELECT id FROM mock_endpoints
      WHERE workspace_id = ? AND method = ? AND endpoint_path = ? AND id != ?
    `).get(ep.workspace_id, cleanMethod, cleanPath, ep.id);

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: { code: 'ROUTE_CONFLICT', message: `Route ${cleanMethod} ${cleanPath} already exists in this workspace.` }
      });
    }
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE mock_endpoints
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        method = COALESCE(?, method),
        endpoint_path = COALESCE(?, endpoint_path),
        response_status = COALESCE(?, response_status),
        response_headers_json = COALESCE(?, response_headers_json),
        response_body = COALESCE(?, response_body),
        content_type = COALESCE(?, content_type),
        delay_ms = COALESCE(?, delay_ms),
        is_enabled = COALESCE(?, is_enabled),
        updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    description !== undefined ? description : null,
    cleanMethod,
    cleanPath,
    response_status !== undefined ? Number(response_status) : null,
    response_headers_json !== undefined ? (typeof response_headers_json === 'string' ? response_headers_json : JSON.stringify(response_headers_json)) : null,
    response_body !== undefined ? response_body : null,
    content_type !== undefined ? content_type : null,
    delay_ms !== undefined ? Math.min(Math.max(Number(delay_ms), 0), 10000) : null,
    is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM mock_endpoints WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// Delete mock endpoint
router.delete('/mock-endpoints/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM mock_endpoints WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Mock endpoint deleted successfully.' });
});

// Get mock activity log for workspace
router.get('/workspaces/:workspaceId/mock-activity', (req, res) => {
  const db = getDatabase();
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const activity = db.prepare(`
    SELECT *
    FROM mock_activity
    WHERE workspace_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.params.workspaceId, limit);

  res.json({ success: true, data: activity });
});

export default router;
