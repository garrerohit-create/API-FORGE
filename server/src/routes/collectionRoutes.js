import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List collections for a workspace
router.get('/workspaces/:workspaceId/collections', (req, res) => {
  const db = getDatabase();
  const collections = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM requests r WHERE r.collection_id = c.id) as request_count,
      (SELECT COUNT(*) FROM folders f WHERE f.collection_id = c.id) as folder_count
    FROM collections c
    WHERE c.workspace_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.workspaceId);

  res.json({ success: true, data: collections });
});

// Create collection in a workspace
router.post('/workspaces/:workspaceId/collections', (req, res) => {
  const db = getDatabase();
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Collection name is required.' }
    });
  }

  const id = `col-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.workspaceId, name, description || '', now, now);

  const created = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Get single collection with folders and requests
router.get('/collections/:id', (req, res) => {
  const db = getDatabase();
  const col = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!col) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Collection not found.' }
    });
  }

  const folders = db.prepare('SELECT * FROM folders WHERE collection_id = ? ORDER BY sort_order ASC').all(req.params.id);
  const requests = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM test_cases tc WHERE tc.request_id = r.id) as test_case_count
    FROM requests r
    WHERE r.collection_id = ?
    ORDER BY r.sort_order ASC, r.created_at ASC
  `).all(req.params.id);

  res.json({
    success: true,
    data: {
      ...col,
      folders,
      requests
    }
  });
});

// Update collection
router.patch('/collections/:id', (req, res) => {
  const db = getDatabase();
  const col = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!col) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Collection not found.' }
    });
  }

  const { name, description } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE collections
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    description !== undefined ? description : null,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// Delete collection
router.delete('/collections/:id', (req, res) => {
  const db = getDatabase();
  const col = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!col) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Collection not found.' }
    });
  }

  db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Collection deleted successfully.' });
});

export default router;
