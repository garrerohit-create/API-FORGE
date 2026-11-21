import express from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';
import { RequestExecutionService } from '../services/requestExecutionService.js';
import { appEvents, EVENT_TYPES } from '../events/appEventEmitter.js';

const router = express.Router();

// List test cases for a request
router.get('/requests/:requestId/test-cases', (req, res) => {
  const db = getDatabase();
  const testCases = db.prepare(`
    SELECT *
    FROM test_cases
    WHERE request_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(req.params.requestId);

  res.json({ success: true, data: testCases });
});

// Add test case to a request
router.post('/requests/:requestId/test-cases', (req, res) => {
  const db = getDatabase();
  const { name, assertion_type, assertion_target, expected_value_json, is_enabled = 1, sort_order = 0 } = req.body;

  if (!assertion_type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'assertion_type is required.' } });
  }

  const id = `tc-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO test_cases (
      id, request_id, name, assertion_type, assertion_target, expected_value_json,
      is_enabled, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.requestId,
    name || `${assertion_type} assertion`,
    assertion_type,
    assertion_target || null,
    String(expected_value_json ?? ''),
    is_enabled ? 1 : 0,
    Number(sort_order),
    now,
    now
  );

  const created = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Update test case
router.patch('/test-cases/:id', (req, res) => {
  const db = getDatabase();
  const tc = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!tc) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Test case not found.' } });
  }

  const { name, assertion_type, assertion_target, expected_value_json, is_enabled, sort_order } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE test_cases
    SET name = COALESCE(?, name),
        assertion_type = COALESCE(?, assertion_type),
        assertion_target = ?,
        expected_value_json = COALESCE(?, expected_value_json),
        is_enabled = COALESCE(?, is_enabled),
        sort_order = COALESCE(?, sort_order),
        updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : null,
    assertion_type !== undefined ? assertion_type : null,
    assertion_target !== undefined ? assertion_target : tc.assertion_target,
    expected_value_json !== undefined ? String(expected_value_json) : null,
    is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
    sort_order !== undefined ? Number(sort_order) : null,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// Delete test case
router.delete('/test-cases/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Test case deleted successfully.' });
});

// List test suites for workspace
router.get('/workspaces/:workspaceId/test-suites', (req, res) => {
  const db = getDatabase();
  const suites = db.prepare(`
    SELECT ts.*,
      (SELECT COUNT(*) FROM test_suite_requests tsr WHERE tsr.test_suite_id = ts.id) as request_count
    FROM test_suites ts
    WHERE ts.workspace_id = ?
    ORDER BY ts.created_at ASC
  `).all(req.params.workspaceId);

  res.json({ success: true, data: suites });
});

// Create test suite
router.post('/workspaces/:workspaceId/test-suites', (req, res) => {
  const db = getDatabase();
  const { name, description, requestIds = [] } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Suite name is required.' } });
  }

  const id = `suite-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO test_suites (id, workspace_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.workspaceId, name, description || '', now, now);

  if (Array.isArray(requestIds)) {
    for (let i = 0; i < requestIds.length; i++) {
      db.prepare(`
        INSERT INTO test_suite_requests (id, test_suite_id, request_id, execution_order)
        VALUES (?, ?, ?, ?)
      `).run(`tsr-${crypto.randomUUID()}`, id, requestIds[i], i + 1);
    }
  }

  const created = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: created });
});

// Run a complete test suite
router.post('/test-suites/:id/run', async (req, res, next) => {
  try {
    const db = getDatabase();
    const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
    if (!suite) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Test suite not found.' } });
    }

    const { environmentId = null } = req.body;
    const runId = `trun-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    // Fetch mapped requests
    const mappedRequests = db.prepare(`
      SELECT r.*
      FROM test_suite_requests tsr
      JOIN requests r ON tsr.request_id = r.id
      WHERE tsr.test_suite_id = ?
      ORDER BY tsr.execution_order ASC
    `).all(suite.id);

    // Create test run record
    db.prepare(`
      INSERT INTO test_runs (id, test_suite_id, workspace_id, started_at, execution_status)
      VALUES (?, ?, ?, ?, 'running')
    `).run(runId, suite.id, suite.workspace_id, startedAt);

    appEvents.emit(EVENT_TYPES.TEST_RUN_STARTED, { runId, suiteId: suite.id });

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalAssertions = 0;
    const allResults = [];

    for (const reqItem of mappedRequests) {
      const assertions = db.prepare(`
        SELECT * FROM test_cases WHERE request_id = ? AND is_enabled = 1 ORDER BY sort_order ASC
      `).all(reqItem.id);

      let headers = [];
      try { headers = JSON.parse(reqItem.headers_json); } catch { headers = []; }
      let queryParams = [];
      try { queryParams = JSON.parse(reqItem.query_params_json); } catch { queryParams = []; }
      let auth = { type: 'none' };
      try { auth = JSON.parse(reqItem.auth_configuration_json); } catch { auth = { type: 'none' }; }

      const execResult = await RequestExecutionService.executeRequest({
        workspaceId: suite.workspace_id,
        collectionId: reqItem.collection_id,
        requestId: reqItem.id,
        environmentId,
        method: reqItem.method,
        urlTemplate: reqItem.url_template,
        headers,
        queryParams,
        bodyType: reqItem.body_type,
        bodyTemplate: reqItem.body_template,
        auth,
        assertions,
        requestSource: 'test_suite',
        customDb: db
      });

      if (execResult.assertions) {
        totalPassed += execResult.assertions.passed;
        totalFailed += execResult.assertions.failed;
        totalSkipped += execResult.assertions.skipped;
        totalAssertions += execResult.assertions.total;

        for (const item of execResult.assertions.results) {
          const resultId = `tres-${crypto.randomUUID()}`;
          db.prepare(`
            INSERT INTO test_results (
              id, test_run_id, test_case_id, assertion_name_snapshot, result_status,
              expected_value_sanitized, actual_value_sanitized, failure_message_sanitized, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'utc'))
          `).run(
            resultId,
            runId,
            item.test_case_id,
            item.assertion_name_snapshot,
            item.result_status,
            item.expected_value_sanitized,
            item.actual_value_sanitized,
            item.failure_message_sanitized
          );

          allResults.push({
            requestId: reqItem.id,
            requestName: reqItem.name,
            ...item
          });
        }
      }
    }

    const completedAt = new Date().toISOString();
    const finalStatus = totalFailed === 0 ? 'passed' : 'failed';

    db.prepare(`
      UPDATE test_runs
      SET completed_at = ?,
          total_assertions = ?,
          passed_assertions = ?,
          failed_assertions = ?,
          skipped_assertions = ?,
          execution_status = ?
      WHERE id = ?
    `).run(completedAt, totalAssertions, totalPassed, totalFailed, totalSkipped, finalStatus, runId);

    const runSummary = {
      runId,
      suiteId: suite.id,
      startedAt,
      completedAt,
      executionStatus: finalStatus,
      totalAssertions,
      passedAssertions: totalPassed,
      failedAssertions: totalFailed,
      skippedAssertions: totalSkipped,
      results: allResults
    };

    appEvents.emit(EVENT_TYPES.TEST_RUN_COMPLETED, runSummary);
    res.json({ success: true, data: runSummary });
  } catch (err) {
    next(err);
  }
});

// Get test run details
router.get('/test-runs/:id', (req, res) => {
  const db = getDatabase();
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Test run not found.' } });
  }

  const results = db.prepare(`
    SELECT *
    FROM test_results
    WHERE test_run_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id);

  res.json({
    success: true,
    data: {
      ...run,
      results
    }
  });
});

export default router;
