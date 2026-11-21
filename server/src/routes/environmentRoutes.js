import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';
import { secretStore } from '../security/secretStore.js';

const router = express.Router();

// List environments for workspace
router.get('/workspaces/:workspaceId/environments', (req, res) => {
  const db = getDatabase();
  const environments = db.prepare(`
    SELECT *
    FROM environments
    WHERE workspace_id = ?
    ORDER BY created_at ASC
  `).all(req.params.workspaceId);

  // Attach variables for each environment
  const result = environments.map((env) => {
    const variables = db.prepare(`
      SELECT id, variable_key, variable_value, is_secret, is_enabled
      FROM environment_variables
      WHERE environment_id = ?
      ORDER BY variable_key ASC
    `).all(env.id);

    // Mask secret values in returned JSON
    const sanitizedVars = variables.map((v) => ({
      ...v,
      variable_value: v.is_secret === 1 ? (secretStore.hasSecret(env.id, v.variable_key) ? '••••••••' : '') : v.variable_value,
      hasSessionSecret: v.is_secret === 1 ? secretStore.hasSecret(env.id, v.variable_key) : false
    }));

    return {
      ...env,
      variables: sanitizedVars
    };
  });

  res.json({ success: true, data: result });
});

// Create environment
router.post('/workspaces/:workspaceId/environments', (req, res) => {
  const db = getDatabase();
  const { name, variables = [] } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Environment name is required.' } });
  }

  const id = `env-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO environments (id, workspace_id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.workspaceId, name, now, now);

  if (Array.isArray(variables)) {
    for (const v of variables) {
      if (v.key) {
        const isSecret = v.is_secret ? 1 : 0;
        const valToStore = isSecret ? null : v.value;

        db.prepare(`
          INSERT OR REPLACE INTO environment_variables (id, environment_id, variable_key, variable_value, is_secret, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(`var-${crypto.randomUUID()}`, id, v.key, valToStore, isSecret, v.is_enabled !== false ? 1 : 0);

        if (isSecret && v.value) {
          secretStore.setSecret(id, v.key, v.value);
        }
      }
    }
  }

  const created = db.prepare('SELECT * FROM environments WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Update environment and its variables
router.patch('/environments/:id', (req, res) => {
  const db = getDatabase();
  const env = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
  if (!env) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Environment not found.' } });
  }

  const { name, variables } = req.body;
  const now = new Date().toISOString();

  if (name !== undefined) {
    db.prepare('UPDATE environments SET name = ?, updated_at = ? WHERE id = ?').run(name, now, req.params.id);
  }

  if (Array.isArray(variables)) {
    // Replace all variables for this environment
    db.prepare('DELETE FROM environment_variables WHERE environment_id = ?').run(req.params.id);

    for (const v of variables) {
      if (v.key || v.variable_key) {
        const key = v.key || v.variable_key;
        const isSecret = (v.is_secret === 1 || v.is_secret === true) ? 1 : 0;
        const rawVal = v.value !== undefined ? v.value : v.variable_value;
        const valToStore = isSecret ? null : rawVal;

        db.prepare(`
          INSERT INTO environment_variables (id, environment_id, variable_key, variable_value, is_secret, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `var-${crypto.randomUUID()}`,
          req.params.id,
          key,
          valToStore,
          isSecret,
          v.is_enabled !== false && v.is_enabled !== 0 ? 1 : 0
        );

        if (isSecret && rawVal && rawVal !== '••••••••') {
          secretStore.setSecret(req.params.id, key, rawVal);
        }
      }
    }
  }

  res.json({ success: true, message: 'Environment updated successfully.' });
});

// Set session-only secret variables in memory
router.put('/environments/:id/secrets', (req, res) => {
  const { secrets = {} } = req.body;
  const envId = req.params.id;

  for (const [key, value] of Object.entries(secrets)) {
    secretStore.setSecret(envId, key, value);
  }

  res.json({
    success: true,
    message: `Stored ${Object.keys(secrets).length} secret(s) in session memory. Note: Secrets will remain in active process memory and reset when server restarts.`
  });
});

// Delete environment
router.delete('/environments/:id', (req, res) => {
  const db = getDatabase();
  secretStore.deleteEnvironmentSecrets(req.params.id);
  db.prepare('DELETE FROM environments WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Environment deleted successfully.' });
});

export default router;
