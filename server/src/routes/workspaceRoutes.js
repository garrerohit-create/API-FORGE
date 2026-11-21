import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List all workspaces
router.get('/', (req, res) => {
  const db = getDatabase();
  const workspaces = db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC').all();
  res.json({ success: true, data: workspaces });
});

// Create workspace
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, slug, description } = req.body;

  if (!name || !slug) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Workspace name and slug are required.' }
    });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const existing = db.prepare('SELECT id FROM workspaces WHERE slug = ?').get(cleanSlug);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'SLUG_CONFLICT', message: `Workspace with slug "${cleanSlug}" already exists.` }
    });
  }

  const id = `ws-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO workspaces (id, name, slug, description, mock_service_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, cleanSlug, description || '', now, now);

  const created = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Get workspace by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!ws) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found.' }
    });
  }
  res.json({ success: true, data: ws });
});

// Update workspace
router.patch('/:id', (req, res) => {
  const db = getDatabase();
  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!ws) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found.' }
    });
  }

  const { name, description, mock_service_enabled } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE workspaces
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        mock_service_enabled = COALESCE(?, mock_service_enabled),
        updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    description !== undefined ? description : null,
    mock_service_enabled !== undefined ? (mock_service_enabled ? 1 : 0) : null,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// Delete workspace
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!ws) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found.' }
    });
  }

  // Prevent deleting default demo workspace
  if (ws.slug === 'demo') {
    return res.status(400).json({
      success: false,
      error: { code: 'FORBIDDEN_OPERATION', message: 'The primary demonstration workspace cannot be deleted.' }
    });
  }

  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Workspace deleted successfully.' });
});

export default router;
