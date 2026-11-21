import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrationRunner.js';
import { seedDemoData } from '../src/database/seeds/001_demo_seed.js';

describe('Mock Endpoint Engine & Dynamic Dispatcher', () => {
  let app;
  let db;

  beforeAll(() => {
    db = getDatabase(':memory:');
    runMigrations(db);
    seedDemoData(db);
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('dispatches GET /mock/demo/users and returns configured mock JSON', async () => {
    const res = await request(app).get('/mock/demo/users');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toBeDefined();
    expect(res.headers['x-mock-engine']).toBe('API-FORGE');
  });

  it('dispatches POST /mock/demo/orders and returns 201 Created', async () => {
    const res = await request(app).post('/mock/demo/orders');
    expect(res.status).toBe(201);
    expect(res.body.orderId).toBe('ORD-98421');
  });

  it('dispatches GET /mock/demo/secure-data and returns 401 Unauthorized', async () => {
    const res = await request(app).get('/mock/demo/secure-data');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when mock endpoint does not exist', async () => {
    const res = await request(app).get('/mock/demo/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MOCK_ENDPOINT_NOT_FOUND');
  });

  it('returns 503 when workspace mock service is disabled', async () => {
    // Disable mock service on demo workspace
    db.prepare('UPDATE workspaces SET mock_service_enabled = 0 WHERE slug = ?').run('demo');

    const res = await request(app).get('/mock/demo/users');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MOCK_SERVICE_DISABLED');

    // Re-enable
    db.prepare('UPDATE workspaces SET mock_service_enabled = 1 WHERE slug = ?').run('demo');
  });
});
