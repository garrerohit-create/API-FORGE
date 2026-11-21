import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List requests for a collection
router.get('/collections/:collectionId/requests', (req, res) => {
  const db = getDatabase();
  const requests = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM test_cases tc WHERE tc.request_id = r.id) as test_case_count
    FROM requests r
    WHERE r.collection_id = ?
    ORDER BY r.sort_order ASC, r.created_at ASC
  `).all(req.params.collectionId);

  res.json({ success: true, data: requests });
});

// Create request in collection
router.post('/collections/:collectionId/requests', (req, res) => {
  const db = getDatabase();
  const {
    name,
    description,
    folder_id,
    method = 'GET',
    url_template,
    headers_json,
    query_params_json,
    body_type = 'none',
    body_template,
    auth_configuration_json,
    request_settings_json,
    sort_order = 0
  } = req.body;

  if (!name || !url_template) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request name and url_template are required.' }
    });
  }

  const id = `req-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO requests (
      id, collection_id, folder_id, name, description, method, url_template,
      headers_json, query_params_json, body_type, body_template, auth_configuration_json,
      request_settings_json, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.collectionId,
    folder_id || null,
    name,
    description || '',
    method.toUpperCase(),
    url_template,
    headers_json || '[]',
    query_params_json || '[]',
    body_type,
    body_template || null,
    auth_configuration_json || '{"type":"none"}',
    request_settings_json || '{}',
    Number(sort_order),
    now,
    now
  );

  const created = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Get request by ID with test cases
router.get('/requests/:id', (req, res) => {
  const db = getDatabase();
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found.' } });
  }

  const testCases = db.prepare('SELECT * FROM test_cases WHERE request_id = ? ORDER BY sort_order ASC').all(req.params.id);

  res.json({
    success: true,
    data: {
      ...request,
      testCases
    }
  });
});

// Update request
router.patch('/requests/:id', (req, res) => {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found.' } });
  }

  const {
    name,
    description,
    folder_id,
    method,
    url_template,
    headers_json,
    query_params_json,
    body_type,
    body_template,
    auth_configuration_json,
    request_settings_json,
    sort_order
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE requests
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        folder_id = ?,
        method = COALESCE(?, method),
        url_template = COALESCE(?, url_template),
        headers_json = COALESCE(?, headers_json),
        query_params_json = COALESCE(?, query_params_json),
        body_type = COALESCE(?, body_type),
        body_template = ?,
        auth_configuration_json = COALESCE(?, auth_configuration_json),
        request_settings_json = COALESCE(?, request_settings_json),
        sort_order = COALESCE(?, sort_order),
        updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    description !== undefined ? description : null,
    folder_id !== undefined ? folder_id : existing.folder_id,
    method !== undefined ? method.toUpperCase() : null,
    url_template !== undefined ? url_template : null,
    headers_json !== undefined ? (typeof headers_json === 'string' ? headers_json : JSON.stringify(headers_json)) : null,
    query_params_json !== undefined ? (typeof query_params_json === 'string' ? query_params_json : JSON.stringify(query_params_json)) : null,
    body_type !== undefined ? body_type : null,
    body_template !== undefined ? body_template : existing.body_template,
    auth_configuration_json !== undefined ? (typeof auth_configuration_json === 'string' ? auth_configuration_json : JSON.stringify(auth_configuration_json)) : null,
    request_settings_json !== undefined ? (typeof request_settings_json === 'string' ? request_settings_json : JSON.stringify(request_settings_json)) : null,
    sort_order !== undefined ? Number(sort_order) : null,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// Delete request
router.delete('/requests/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Request deleted successfully.' });
});

export default router;
