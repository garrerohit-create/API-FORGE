import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase } from '../src/database/connection.js';
import { runMigrations } from '../src/database/migrationRunner.js';
import { seedDemoData } from '../src/database/seeds/001_demo_seed.js';
import { ImportExportService } from '../src/services/importExportService.js';

describe('Import & Export Service', () => {
  let db;

  beforeAll(() => {
    db = getDatabase(':memory:');
    runMigrations(db);
    seedDemoData(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('exports a collection in native api-forge/v1 format', () => {
    const exported = ImportExportService.exportCollection('col-students', db);
    expect(exported.schemaVersion).toBe('api-forge/v1');
    expect(exported.collection).toBeDefined();
    expect(exported.collection.name).toBe('Student Management API');
    expect(Array.isArray(exported.collection.requests)).toBe(true);
    expect(exported.collection.requests.length).toBeGreaterThan(0);
  });

  it('imports an api-forge/v1 collection into a workspace', () => {
    // Create new target workspace
    db.prepare(`
      INSERT INTO workspaces (id, name, slug, description, mock_service_enabled)
      VALUES ('ws-target', 'Target Workspace', 'target', 'Testing imports', 1)
    `).run();

    const sampleExport = ImportExportService.exportCollection('col-students', db);
    const result = ImportExportService.importNativeCollection('ws-target', sampleExport, db);

    expect(result.success).toBe(true);
    expect(result.collectionId).toBeDefined();
    expect(result.importedRequests).toBe(sampleExport.collection.requests.length);

    // Verify records exist in target workspace
    const importedCol = db.prepare('SELECT * FROM collections WHERE id = ?').get(result.collectionId);
    expect(importedCol.workspace_id).toBe('ws-target');
  });

  it('imports a Postman Collection v2.1 format gracefully skipping scripts', () => {
    const postmanJson = {
      info: {
        name: 'Postman Sample Collection',
        description: 'Postman test collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Echo GET',
          event: [{ listen: 'test', script: { exec: ['console.log("skip me");'] } }],
          request: {
            method: 'GET',
            url: { raw: 'http://127.0.0.1:5000/demo/v1/students' },
            header: [{ key: 'Accept', value: 'application/json' }]
          }
        }
      ]
    };

    const res = ImportExportService.importPostmanCollection('ws-target', postmanJson, db);
    expect(res.success).toBe(true);
    expect(res.importedRequests).toBe(1);
    expect(res.skippedScripts).toBe(1);
  });

  it('rejects invalid import files and throws clear error', () => {
    expect(() =>
      ImportExportService.importNativeCollection('ws-target', { invalid: 'payload' })
    ).toThrowError(/Invalid collection format/);
  });
});
