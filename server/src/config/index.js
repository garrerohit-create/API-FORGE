import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load .env from root or server directory
const rootEnvPath = path.resolve(process.cwd(), '.env');
const serverEnvPath = path.resolve(process.cwd(), 'server', '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

const parseNumber = (val, defaultVal) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultVal;
};

const parseBoolean = (val, defaultVal) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  return String(val).toLowerCase() === 'true' || val === '1';
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  port: parseNumber(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || null,
  databasePath: process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/apiforge.sqlite' : './data/apiforge.sqlite'),
  requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 15000),
  maxRequestTimeoutMs: parseNumber(process.env.MAX_REQUEST_TIMEOUT_MS, 60000),
  maxRequestBytes: parseNumber(process.env.MAX_REQUEST_BYTES, 1024 * 1024), // 1MB
  maxResponseBytes: parseNumber(process.env.MAX_RESPONSE_BYTES, 5 * 1024 * 1024), // 5MB
  allowPublicApiRequests: parseBoolean(process.env.ALLOW_PUBLIC_API_REQUESTS, false),
  appVersion: '1.0.0'
};
