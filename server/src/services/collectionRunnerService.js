import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';
import { RequestExecutionService } from './requestExecutionService.js';
import { appEvents, EVENT_TYPES } from '../events/appEventEmitter.js';

// Map of running collection runs: runId -> boolean (isCancelled)
const activeCollectionRuns = new Map();

/**
 * Sequential Collection Runner.
 * Executes requests in order with bounded iterations, live progress,
 * assertion checks, and cancellation support.
 */
export class CollectionRunnerService {
  static cancelRun(runId) {
    if (activeCollectionRuns.has(runId)) {
      activeCollectionRuns.set(runId, true);
      return true;
    }
    return false;
  }

  static async runCollection(collectionId, options = {}) {
    const {
      workspaceId,
      environmentId = null,
      iterations = 1,
      selectedRequestIds = null
    } = options;

    const db = getDatabase();
    const runId = `run-${crypto.randomUUID()}`;
    activeCollectionRuns.set(runId, false);

    // 1. Fetch requests for this collection
    let sql = `
      SELECT r.*
      FROM requests r
      WHERE r.collection_id = ?
    `;
    const params = [collectionId];

    if (Array.isArray(selectedRequestIds) && selectedRequestIds.length > 0) {
      const placeholders = selectedRequestIds.map(() => '?').join(',');
      sql += ` AND r.id IN (${placeholders})`;
      params.push(...selectedRequestIds);
    }

    sql += ' ORDER BY r.sort_order ASC, r.created_at ASC';
    const requests = db.prepare(sql).all(...params);

    if (requests.length === 0) {
      throw new Error('Collection contains no eligible requests to execute.');
    }

    const boundedIterations = Math.min(Math.max(Number(iterations || 1), 1), 3);
    const results = [];
    const runStart = performance.now();

    appEvents.emit(EVENT_TYPES.COLLECTION_RUN_STARTED, { runId, collectionId, totalRequests: requests.length });

    let totalPassedAssertions = 0;
    let totalFailedAssertions = 0;
    let successfulRequests = 0;
    let nonSuccessRequests = 0;
    let transportErrors = 0;

    try {
      for (let iter = 1; iter <= boundedIterations; iter++) {
        for (const req of requests) {
          // Check cancellation
          if (activeCollectionRuns.get(runId) === true) {
            results.push({
              iteration: iter,
              requestId: req.id,
              requestName: req.name,
              status: 0,
              executionStatus: 'cancelled',
              message: 'Collection execution was cancelled.'
            });
            break;
          }

          // Fetch test cases for this request
          const testCases = db.prepare(`
            SELECT * FROM test_cases WHERE request_id = ? AND is_enabled = 1 ORDER BY sort_order ASC
          `).all(req.id);

          let headers = [];
          try {
            headers = JSON.parse(req.headers_json || '[]');
          } catch {
            headers = [];
          }

          let queryParams = [];
          try {
            queryParams = JSON.parse(req.query_params_json || '[]');
          } catch {
            queryParams = [];
          }

          let auth = { type: 'none' };
          try {
            auth = JSON.parse(req.auth_configuration_json || '{"type":"none"}');
          } catch {
            auth = { type: 'none' };
          }

          let settings = {};
          try {
            settings = JSON.parse(req.request_settings_json || '{}');
          } catch {
            settings = {};
          }

          const executionResult = await RequestExecutionService.executeRequest({
            workspaceId,
            collectionId,
            requestId: req.id,
            environmentId,
            method: req.method,
            urlTemplate: req.url_template,
            headers,
            queryParams,
            bodyType: req.body_type,
            bodyTemplate: req.body_template,
            auth,
            settings,
            assertions: testCases,
            requestSource: 'collection_runner',
            customDb: db
          });

          if (executionResult.executionStatus === 'success') {
            successfulRequests++;
          } else if (executionResult.executionStatus === 'http_error') {
            nonSuccessRequests++;
          } else {
            transportErrors++;
          }

          totalPassedAssertions += executionResult.assertions?.passed || 0;
          totalFailedAssertions += executionResult.assertions?.failed || 0;

          results.push({
            iteration: iter,
            requestId: req.id,
            requestName: req.name,
            method: req.method,
            url: req.url_template,
            status: executionResult.status,
            statusText: executionResult.statusText,
            durationMs: executionResult.durationMs,
            sizeBytes: executionResult.sizeBytes,
            executionStatus: executionResult.executionStatus,
            assertions: executionResult.assertions
          });
        }

        if (activeCollectionRuns.get(runId) === true) break;
      }
    } finally {
      activeCollectionRuns.delete(runId);
    }

    const totalDurationMs = performance.now() - runStart;

    const summary = {
      runId,
      collectionId,
      totalExecuted: results.length,
      successfulRequests,
      nonSuccessRequests,
      transportErrors,
      passedAssertions: totalPassedAssertions,
      failedAssertions: totalFailedAssertions,
      totalDurationMs: Number(totalDurationMs.toFixed(1)),
      averageResponseTime: results.length > 0
        ? Number((results.reduce((acc, r) => acc + (r.durationMs || 0), 0) / results.length).toFixed(1))
        : 0,
      results
    };

    appEvents.emit(EVENT_TYPES.COLLECTION_RUN_COMPLETED, summary);
    return summary;
  }
}
