import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { validateDestinationUrl } from '../security/ssrfValidator.js';
import { sanitizeUrl, sanitizeHeaders } from '../security/sanitizer.js';
import { evaluateAllAssertions } from './assertionEngine.js';
import { interpolateString, getEnvironmentVariablesMap } from './environmentResolutionService.js';
import { getDatabase } from '../database/connection.js';
import { appEvents, EVENT_TYPES } from '../events/appEventEmitter.js';

// Map of currently running executions for cancellation: executionId -> AbortController
const activeExecutions = new Map();

export class RequestExecutionService {
  /**
   * Cancels a running execution by ID.
   */
  static cancelExecution(executionId) {
    const controller = activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Executes an HTTP request with timing, SSRF validation, size caps, and assertions.
   */
  static async executeRequest(options) {
    const {
      workspaceId,
      collectionId = null,
      requestId = null,
      environmentId = null,
      method = 'GET',
      urlTemplate,
      headers = [],
      queryParams = [],
      bodyType = 'none',
      bodyTemplate = null,
      auth = { type: 'none' },
      settings = {},
      assertions = [],
      requestSource = 'client',
      customDb = null
    } = options;

    const executionId = `exec-${crypto.randomUUID()}`;
    const controller = new AbortController();
    activeExecutions.set(executionId, controller);

    const db = customDb || getDatabase();
    const timeoutMs = Math.min(
      Number(settings.timeoutMs || config.requestTimeoutMs),
      config.maxRequestTimeoutMs
    );
    const maxResponseBytes = Math.min(
      Number(settings.maxResponseBytes || config.maxResponseBytes),
      config.maxResponseBytes
    );

    // 1. Resolve environment variables
    const varMap = environmentId ? getEnvironmentVariablesMap(environmentId, db) : {};

    let resolvedUrl = interpolateString(urlTemplate, varMap);
    
    // Append query params
    if (Array.isArray(queryParams) && queryParams.length > 0) {
      const urlObj = new URL(resolvedUrl);
      for (const q of queryParams) {
        if (q.enabled !== false && q.key) {
          const k = interpolateString(q.key, varMap);
          const v = interpolateString(q.value ?? '', varMap);
          urlObj.searchParams.append(k, v);
        }
      }
      resolvedUrl = urlObj.toString();
    }

    // 2. Validate destination for SSRF prevention
    const destination = await validateDestinationUrl(resolvedUrl, {
      allowPublicApiRequests: settings.allowPublicApiRequests ?? config.allowPublicApiRequests
    });

    // 3. Construct headers
    const requestHeaders = {};
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false && h.key) {
          const k = interpolateString(h.key, varMap);
          const v = interpolateString(h.value ?? '', varMap);
          requestHeaders[k] = v;
        }
      }
    }

    // 4. Construct Authorization
    if (auth && auth.type) {
      if (auth.type === 'bearer' && auth.token) {
        const token = interpolateString(auth.token, varMap);
        requestHeaders['Authorization'] = `Bearer ${token}`;
      } else if (auth.type === 'basic' && (auth.username || auth.password)) {
        const user = interpolateString(auth.username ?? '', varMap);
        const pass = interpolateString(auth.password ?? '', varMap);
        const creds = Buffer.from(`${user}:${pass}`).toString('base64');
        requestHeaders['Authorization'] = `Basic ${creds}`;
      } else if (auth.type === 'api_key' && auth.key && auth.value) {
        const k = interpolateString(auth.key, varMap);
        const v = interpolateString(auth.value, varMap);
        if (auth.addTo === 'query') {
          const u = new URL(resolvedUrl);
          u.searchParams.set(k, v);
          resolvedUrl = u.toString();
        } else {
          requestHeaders[k] = v;
        }
      }
    }

    // 5. Construct payload body
    let requestPayload = null;
    if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
      if (bodyType === 'json' && bodyTemplate) {
        const interpolated = interpolateString(bodyTemplate, varMap);
        requestPayload = Buffer.from(interpolated, 'utf-8');
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      } else if (bodyType === 'text' && bodyTemplate) {
        const interpolated = interpolateString(bodyTemplate, varMap);
        requestPayload = Buffer.from(interpolated, 'utf-8');
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'text/plain';
        }
      } else if (bodyType === 'urlencoded' && bodyTemplate) {
        const interpolated = interpolateString(bodyTemplate, varMap);
        requestPayload = Buffer.from(interpolated, 'utf-8');
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }

      if (requestPayload && requestPayload.length > config.maxRequestBytes) {
        throw new Error(`Request payload size (${requestPayload.length} bytes) exceeds limit of ${config.maxRequestBytes} bytes.`);
      }
      if (requestPayload) {
        requestHeaders['Content-Length'] = String(requestPayload.length);
      }
    }

    appEvents.emit(EVENT_TYPES.REQUEST_STARTED, { executionId, method, url: resolvedUrl });

    // 6. Execute HTTP request with monotonic timing & size capping
    const parsedTarget = new URL(resolvedUrl);
    const isHttps = parsedTarget.protocol === 'https:';
    const transport = isHttps ? https : http;

    const startPerf = performance.now();
    let timeoutTimer = null;

    try {
      const response = await new Promise((resolve, reject) => {
        let isTimedOut = false;

        // Set timeout
        timeoutTimer = setTimeout(() => {
          isTimedOut = true;
          controller.abort();
          const err = new Error(`Request failed because target did not respond within ${timeoutMs}ms.`);
          err.code = 'ETIMEDOUT';
          reject(err);
        }, timeoutMs);

        // Cancellation signal listener
        controller.signal.addEventListener('abort', () => {
          if (isTimedOut) return;
          const err = new Error('Request was cancelled by user.');
          err.code = 'ECANCELLED';
          reject(err);
        });

        const reqOptions = {
          protocol: parsedTarget.protocol,
          hostname: parsedTarget.hostname,
          port: parsedTarget.port || (isHttps ? 443 : 80),
          path: parsedTarget.pathname + parsedTarget.search,
          method: method.toUpperCase(),
          headers: requestHeaders,
          signal: controller.signal
        };

        const clientReq = transport.request(reqOptions, (clientRes) => {
          const chunks = [];
          let receivedBytes = 0;

          clientRes.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (receivedBytes > maxResponseBytes) {
              clientReq.destroy();
              const err = new Error(`Response body exceeded maximum allowed limit of ${maxResponseBytes} bytes.`);
              err.code = 'ERESPONSE_TOO_LARGE';
              reject(err);
              return;
            }
            chunks.push(chunk);
          });

          clientRes.on('end', () => {
            clearTimeout(timeoutTimer);
            const durationMs = performance.now() - startPerf;
            const fullBuffer = Buffer.concat(chunks);
            const rawBody = fullBuffer.toString('utf-8');

            let parsedJson = null;
            const contentType = clientRes.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              try {
                parsedJson = JSON.parse(rawBody);
              } catch {
                parsedJson = null;
              }
            }

            resolve({
              status: clientRes.statusCode,
              statusText: clientRes.statusMessage || '',
              headers: clientRes.headers,
              durationMs,
              sizeBytes: fullBuffer.length,
              rawBody,
              body: parsedJson,
              contentType
            });
          });
        });

        clientReq.on('error', (err) => {
          clearTimeout(timeoutTimer);
          reject(err);
        });

        if (requestPayload) {
          clientReq.write(requestPayload);
        }
        clientReq.end();
      });

      // 7. Evaluate declarative assertions
      const assertionSummary = evaluateAllAssertions(assertions, response);

      const executionStatus =
        response.status >= 200 && response.status < 300
          ? 'success'
          : 'http_error';

      // 8. Record in request_history
      const historyId = `hist-${crypto.randomUUID()}`;
      const sanitizedUrlStr = sanitizeUrl(resolvedUrl);

      db.prepare(`
        INSERT INTO request_history (
          id, workspace_id, request_id, collection_id, method, sanitized_url,
          status_code, response_time_ms, response_size_bytes, execution_status,
          request_source, error_category, passed_assertions, failed_assertions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now', 'utc'))
      `).run(
        historyId,
        workspaceId,
        requestId,
        collectionId,
        method.toUpperCase(),
        sanitizedUrlStr,
        response.status,
        response.durationMs,
        response.sizeBytes,
        executionStatus,
        requestSource,
        assertionSummary.passed,
        assertionSummary.failed
      );

      appEvents.emit(EVENT_TYPES.REQUEST_COMPLETED, {
        executionId,
        method,
        status: response.status,
        durationMs: response.durationMs
      });

      return {
        executionId,
        status: response.status,
        statusText: response.statusText,
        durationMs: response.durationMs,
        sizeBytes: response.sizeBytes,
        headers: response.headers,
        body: response.body,
        rawBody: response.rawBody,
        contentType: response.contentType,
        assertions: assertionSummary,
        executionStatus
      };
    } catch (err) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      const durationMs = performance.now() - startPerf;

      let executionStatus = 'transport_error';
      let errorCategory = err.code || 'UNKNOWN_TRANSPORT_ERROR';

      if (err.code === 'ETIMEDOUT') {
        executionStatus = 'timeout';
        errorCategory = 'TIMEOUT';
      } else if (err.code === 'ECANCELLED') {
        executionStatus = 'cancelled';
        errorCategory = 'CANCELLED';
      }

      // Record failure in history
      const historyId = `hist-${crypto.randomUUID()}`;
      const sanitizedUrlStr = sanitizeUrl(resolvedUrl);

      db.prepare(`
        INSERT INTO request_history (
          id, workspace_id, request_id, collection_id, method, sanitized_url,
          status_code, response_time_ms, response_size_bytes, execution_status,
          request_source, error_category, passed_assertions, failed_assertions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, ?, ?, 0, ?, datetime('now', 'utc'))
      `).run(
        historyId,
        workspaceId,
        requestId,
        collectionId,
        method.toUpperCase(),
        sanitizedUrlStr,
        durationMs,
        executionStatus,
        requestSource,
        errorCategory,
        assertions.length
      );

      appEvents.emit(EVENT_TYPES.REQUEST_FAILED, {
        executionId,
        method,
        error: err.message,
        category: errorCategory
      });

      return {
        executionId,
        status: 0,
        statusText: 'Transport Error',
        durationMs,
        sizeBytes: 0,
        headers: {},
        body: null,
        rawBody: '',
        error: {
          code: errorCategory,
          message: err.message
        },
        assertions: {
          total: assertions.length,
          passed: 0,
          failed: assertions.length,
          skipped: 0,
          results: assertions.map((a) => ({
            assertion_name_snapshot: a.name || 'Assertion',
            result_status: 'error',
            failure_message_sanitized: `Request failed before response: ${err.message}`
          }))
        },
        executionStatus
      };
    } finally {
      activeExecutions.delete(executionId);
    }
  }
}
