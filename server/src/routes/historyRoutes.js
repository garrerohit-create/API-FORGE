import express from 'express';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

// List execution history for workspace with filters and pagination
router.get('/workspaces/:workspaceId/history', (req, res) => {
  const db = getDatabase();
  const {
    method,
    statusCategory,
    search,
    limit = 50,
    page = 1
  } = req.query;

  const parsedLimit = Math.min(Math.max(Number(limit), 1), 200);
  const parsedPage = Math.max(Number(page), 1);
  const offset = (parsedPage - 1) * parsedLimit;

  let sql = 'WHERE workspace_id = ?';
  const params = [req.params.workspaceId];

  if (method) {
    sql += ' AND method = ?';
    params.push(method.toUpperCase());
  }

  if (statusCategory === '2xx') {
    sql += ' AND status_code >= 200 AND status_code < 300';
  } else if (statusCategory === '3xx') {
    sql += ' AND status_code >= 300 AND status_code < 400';
  } else if (statusCategory === '4xx') {
    sql += ' AND status_code >= 400 AND status_code < 500';
  } else if (statusCategory === '5xx') {
    sql += ' AND status_code >= 500 AND status_code < 600';
  } else if (statusCategory === 'error') {
    sql += " AND execution_status IN ('transport_error', 'timeout', 'cancelled')";
  }

  if (search) {
    sql += ' AND sanitized_url LIKE ?';
    params.push(`%${search}%`);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM request_history ${sql}`).get(...params);
  const total = countRow ? countRow.count : 0;

  const rows = db.prepare(`
    SELECT *
    FROM request_history
    ${sql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parsedLimit, offset);

  res.json({
    success: true,
    data: rows,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
});

// Delete single history record
router.delete('/history/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM request_history WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'History record deleted.' });
});

// Clear all history for workspace
router.delete('/workspaces/:workspaceId/history', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM request_history WHERE workspace_id = ?').run(req.params.workspaceId);
  res.json({ success: true, message: 'Workspace history cleared successfully.' });
});

export default router;
