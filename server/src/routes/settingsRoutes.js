import express from 'express';
import { getDatabase } from '../database/connection.js';
import { config } from '../config/index.js';
import { seedDemoData } from '../database/seeds/001_demo_seed.js';

const router = express.Router();

// Get application settings
router.get('/settings', (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT setting_key, setting_value_json, updated_at FROM app_settings').all();
  
  const settingsObj = {};
  for (const r of rows) {
    try {
      settingsObj[r.setting_key] = JSON.parse(r.setting_value_json);
    } catch {
      settingsObj[r.setting_key] = r.setting_value_json;
    }
  }

  res.json({
    success: true,
    data: {
      settings: settingsObj,
      serverConfig: {
        host: config.host,
        port: config.port,
        requestTimeoutMs: config.requestTimeoutMs,
        maxRequestTimeoutMs: config.maxRequestTimeoutMs,
        maxRequestBytes: config.maxRequestBytes,
        maxResponseBytes: config.maxResponseBytes,
        allowPublicApiRequests: config.allowPublicApiRequests,
        databasePath: config.databasePath,
        version: config.appVersion
      }
    }
  });
});

// Update an application setting
router.patch('/settings', (req, res) => {
  const db = getDatabase();
  const { key, value } = req.body;

  if (!key) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Setting key is required.' } });
  }

  const now = new Date().toISOString();
  const valJson = typeof value === 'string' ? value : JSON.stringify(value);

  db.prepare(`
    INSERT INTO app_settings (setting_key, setting_value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value_json = excluded.setting_value_json,
      updated_at = excluded.updated_at
  `).run(key, valJson, now);

  res.json({ success: true, message: `Setting "${key}" updated successfully.` });
});

// Reset demonstration data explicitly
router.post('/settings/reset-demo', (req, res) => {
  try {
    const db = getDatabase();
    // Delete only demo student rows and re-seed
    db.prepare('DELETE FROM students').run();
    seedDemoData(db);

    res.json({ success: true, message: 'Demonstration records reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'RESET_FAILED', message: err.message } });
  }
});

export default router;
