import { getDatabase } from '../database/connection.js';

/**
 * Calculates genuine SQLite-backed analytics from request_history and mock_activity.
 * Never fabricates numbers. Handles zero-data states gracefully.
 */
export class AnalyticsService {
  static getWorkspaceAnalytics(workspaceId, filters = {}) {
    const db = getDatabase();
    const { timeRange = 'all', method, collectionId } = filters;

    let whereClause = 'WHERE workspace_id = ?';
    const params = [workspaceId];

    if (method) {
      whereClause += ' AND method = ?';
      params.push(method.toUpperCase());
    }

    if (collectionId) {
      whereClause += ' AND collection_id = ?';
      params.push(collectionId);
    }

    if (timeRange === '24h') {
      whereClause += " AND created_at >= datetime('now', '-1 day')";
    } else if (timeRange === '7d') {
      whereClause += " AND created_at >= datetime('now', '-7 days')";
    } else if (timeRange === '30d') {
      whereClause += " AND created_at >= datetime('now', '-30 days')";
    }

    // 1. Overview counts
    const countRow = db.prepare(`
      SELECT
        COUNT(*) as totalRequests,
        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successfulRequests,
        SUM(CASE WHEN execution_status = 'http_error' THEN 1 ELSE 0 END) as httpErrors,
        SUM(CASE WHEN execution_status IN ('transport_error', 'timeout', 'cancelled') THEN 1 ELSE 0 END) as transportErrors,
        SUM(passed_assertions) as totalPassedAssertions,
        SUM(failed_assertions) as totalFailedAssertions
      FROM request_history
      ${whereClause}
    `).get(...params);

    const total = countRow?.totalRequests || 0;
    const success = countRow?.successfulRequests || 0;
    const httpErr = countRow?.httpErrors || 0;
    const transErr = countRow?.transportErrors || 0;
    const passedAssertions = countRow?.totalPassedAssertions || 0;
    const failedAssertions = countRow?.totalFailedAssertions || 0;
    const totalAssertions = passedAssertions + failedAssertions;

    // 2. Latency percentiles (min, max, avg, median, p95)
    const latencyRows = db.prepare(`
      SELECT response_time_ms
      FROM request_history
      ${whereClause} AND response_time_ms IS NOT NULL AND execution_status IN ('success', 'http_error')
      ORDER BY response_time_ms ASC
    `).all(...params);

    let minLatency = 0;
    let maxLatency = 0;
    let avgLatency = 0;
    let medianLatency = 0;
    let p95Latency = 0;

    if (latencyRows.length > 0) {
      const times = latencyRows.map((r) => r.response_time_ms);
      minLatency = times[0];
      maxLatency = times[times.length - 1];
      const sum = times.reduce((acc, val) => acc + val, 0);
      avgLatency = sum / times.length;

      const medianIdx = Math.floor(times.length * 0.5);
      medianLatency = times[medianIdx];

      const p95Idx = Math.min(Math.floor(times.length * 0.95), times.length - 1);
      p95Latency = times[p95Idx];
    }

    // 3. Status category breakdown (2xx, 3xx, 4xx, 5xx, errors)
    const statusRows = db.prepare(`
      SELECT
        CASE
          WHEN status_code >= 200 AND status_code < 300 THEN '2xx Success'
          WHEN status_code >= 300 AND status_code < 400 THEN '3xx Redirection'
          WHEN status_code >= 400 AND status_code < 500 THEN '4xx Client Error'
          WHEN status_code >= 500 AND status_code < 600 THEN '5xx Server Error'
          ELSE 'Transport / Network Error'
        END as category,
        COUNT(*) as count
      FROM request_history
      ${whereClause}
      GROUP BY category
    `).all(...params);

    // 4. Method distribution
    const methodRows = db.prepare(`
      SELECT method, COUNT(*) as count
      FROM request_history
      ${whereClause}
      GROUP BY method
      ORDER BY count DESC
    `).all(...params);

    // 5. Most frequently executed endpoints
    const topEndpoints = db.prepare(`
      SELECT method, sanitized_url, COUNT(*) as count, AVG(response_time_ms) as avg_time
      FROM request_history
      ${whereClause}
      GROUP BY method, sanitized_url
      ORDER BY count DESC
      LIMIT 10
    `).all(...params);

    // 6. Time series buckets (group by hour or day)
    const timeline = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00', created_at) as timeBucket,
        COUNT(*) as requestCount,
        AVG(response_time_ms) as avgLatency,
        SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successCount
      FROM request_history
      ${whereClause}
      GROUP BY timeBucket
      ORDER BY timeBucket ASC
      LIMIT 50
    `).all(...params);

    // 7. Active Mock Endpoints count in workspace
    const mockCountRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM mock_endpoints
      WHERE workspace_id = ? AND is_enabled = 1
    `).get(workspaceId);

    // 8. Collections count
    const colCountRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM collections
      WHERE workspace_id = ?
    `).get(workspaceId);

    return {
      overview: {
        totalRequests: total,
        successfulRequests: success,
        httpErrors: httpErr,
        transportErrors: transErr,
        successRate: total > 0 ? Number(((success / total) * 100).toFixed(1)) : 0,
        averageResponseTime: Number(avgLatency.toFixed(1)),
        minResponseTime: Number(minLatency.toFixed(1)),
        maxResponseTime: Number(maxLatency.toFixed(1)),
        medianResponseTime: Number(medianLatency.toFixed(1)),
        p95ResponseTime: Number(p95Latency.toFixed(1)),
        activeMockEndpoints: mockCountRow?.count || 0,
        savedCollections: colCountRow?.count || 0,
        testPassRate: totalAssertions > 0 ? Number(((passedAssertions / totalAssertions) * 100).toFixed(1)) : 100,
        totalPassedAssertions: passedAssertions,
        totalFailedAssertions: failedAssertions
      },
      statusDistribution: statusRows,
      methodDistribution: methodRows,
      topEndpoints: topEndpoints.map((e) => ({
        ...e,
        avg_time: Number((e.avg_time || 0).toFixed(1))
      })),
      timeline
    };
  }
}
