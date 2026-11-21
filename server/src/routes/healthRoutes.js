import express from 'express';
import os from 'node:os';
import { config } from '../config/index.js';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const db = getDatabase();
  let dbStatus = 'ok';
  try {
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    version: config.appVersion
  });
});

router.get('/system/info', (req, res) => {
  res.json({
    success: true,
    data: {
      appName: 'API FORGE',
      version: config.appVersion,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      cpuCount: os.cpus().length,
      serverTime: new Date().toISOString(),
      config: {
        host: config.host,
        port: config.port,
        requestTimeoutMs: config.requestTimeoutMs,
        maxRequestTimeoutMs: config.maxRequestTimeoutMs,
        maxRequestBytes: config.maxRequestBytes,
        maxResponseBytes: config.maxResponseBytes,
        allowPublicApiRequests: config.allowPublicApiRequests
      }
    }
  });
});

export default router;
