import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrationRunner.js';

describe('Demonstration Student CRUD API Integration', () => {
  let app;
  let db;

  beforeAll(() => {
    // In-memory isolated database for tests
    db = getDatabase(':memory:');
    runMigrations(db);
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /api/v1/health returns status healthy', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('ok');
  });

  it('POST /demo/v1/students creates a new student (201 Created)', async () => {
    const newStudent = {
      name: 'Thomas Anderson',
      email: 'thomas.anderson@matrix.edu',
      department: 'Computer Science',
      year: 4
    };

    const res = await request(app)
      .post('/demo/v1/students')
      .send(newStudent);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Thomas Anderson');
    expect(res.body.data.email).toBe('thomas.anderson@matrix.edu');
    expect(res.body.data.id).toBeDefined();
  });

  it('POST /demo/v1/students rejects duplicate email (409 Conflict)', async () => {
    const duplicateStudent = {
      name: 'Copy Anderson',
      email: 'thomas.anderson@matrix.edu',
      department: 'Physics',
      year: 2
    };

    const res = await request(app)
      .post('/demo/v1/students')
      .send(duplicateStudent);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_CONFLICT');
  });

  it('GET /demo/v1/students returns list of students with pagination', async () => {
    const res = await request(app).get('/demo/v1/students');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /demo/v1/students/:id returns 404 for nonexistent student', async () => {
    const res = await request(app).get('/demo/v1/students/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /demo/v1/students/:id replaces student record', async () => {
    const updatedData = {
      name: 'Thomas Neo Anderson',
      email: 'neo.matrix@matrix.edu',
      department: 'Artificial Intelligence',
      year: 5
    };

    const res = await request(app)
      .put('/demo/v1/students/1')
      .send(updatedData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Thomas Neo Anderson');
  });

  it('PATCH /demo/v1/students/:id updates partial field', async () => {
    const res = await request(app)
      .patch('/demo/v1/students/1')
      .send({ department: 'Quantum Computing' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.department).toBe('Quantum Computing');
    expect(res.body.data.name).toBe('Thomas Neo Anderson');
  });

  it('DELETE /demo/v1/students/:id deletes student with 204 No Content', async () => {
    const res = await request(app).delete('/demo/v1/students/1');
    expect(res.status).toBe(204);

    // Verify student is gone
    const checkRes = await request(app).get('/demo/v1/students/1');
    expect(checkRes.status).toBe(404);
  });
});
