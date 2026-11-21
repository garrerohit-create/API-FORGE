import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List folders for a collection
router.get('/collections/:collectionId/folders', (req, res) => {
  const db = getDatabase();
  const folders = db.prepare('SELECT * FROM folders WHERE collection_id = ? ORDER BY sort_order ASC').all(req.params.collectionId);
  res.json({ success: true, data: folders });
});

// Create folder in collection
router.post('/collections/:collectionId/folders', (req, res) => {
  const db = getDatabase();
  const { name, parent_folder_id } = req.body;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Folder name is required.' }
    });
  }

  const id = `fld-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO folders (id, collection_id, parent_folder_id, name, sort_order, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, req.params.collectionId, parent_folder_id || null, name, now);

  const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Update folder
router.patch('/folders/:id', (req, res) => {
  const db = getDatabase();
  const { name, sort_order } = req.body;
  
  db.prepare(`
    UPDATE folders
    SET name = COALESCE(?, name),
        sort_order = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    sort_order !== undefined ? Number(sort_order) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
  if (!updated) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Folder not found.' } });
  }
  res.json({ success: true, data: updated });
});

// Delete folder
router.delete('/folders/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Folder deleted successfully.' });
});

export default router;
