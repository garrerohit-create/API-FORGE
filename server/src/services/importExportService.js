import crypto from 'node:crypto';
import { getDatabase } from '../database/connection.js';

/**
 * Import & Export Service for API FORGE.
 * Implements versioned native collection format (api-forge/v1) and Postman v2.1 import.
 * Sanitizes and protects secrets.
 */
export class ImportExportService {
  /**
   * Exports a collection into the native API FORGE JSON format.
   */
  static exportCollection(collectionId, customDb = null) {
    const db = customDb || getDatabase();
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const folders = db.prepare('SELECT * FROM folders WHERE collection_id = ? ORDER BY sort_order ASC').all(collectionId);
    const requests = db.prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY sort_order ASC').all(collectionId);

    const requestsWithTests = requests.map((req) => {
      const testCases = db.prepare('SELECT * FROM test_cases WHERE request_id = ? ORDER BY sort_order ASC').all(req.id);
      
      let headers = [];
      try {
        headers = JSON.parse(req.headers_json);
      } catch {
        headers = [];
      }

      // Sanitize headers so raw secrets are not exported
      const safeHeaders = headers.map((h) => ({
        key: h.key,
        value: h.isSecret ? '' : h.value,
        enabled: h.enabled !== false
      }));

      let queryParams = [];
      try {
        queryParams = JSON.parse(req.query_params_json);
      } catch {
        queryParams = [];
      }

      let auth = { type: 'none' };
      try {
        auth = JSON.parse(req.auth_configuration_json);
        // Mask token in export
        if (auth.token) auth.token = '';
        if (auth.password) auth.password = '';
      } catch {
        auth = { type: 'none' };
      }

      let settings = {};
      try {
        settings = JSON.parse(req.request_settings_json);
      } catch {
        settings = {};
      }

      return {
        name: req.name,
        description: req.description,
        folderName: req.folder_id ? folders.find((f) => f.id === req.folder_id)?.name : null,
        method: req.method,
        urlTemplate: req.url_template,
        headers: safeHeaders,
        queryParams,
        bodyType: req.body_type,
        bodyTemplate: req.body_template,
        auth,
        settings,
        testCases: testCases.map((tc) => ({
          name: tc.name,
          assertionType: tc.assertion_type,
          assertionTarget: tc.assertion_target,
          expectedValue: tc.expected_value_json,
          isEnabled: tc.is_enabled === 1
        }))
      };
    });

    return {
      schemaVersion: 'api-forge/v1',
      exportedAt: new Date().toISOString(),
      collection: {
        name: collection.name,
        description: collection.description,
        folders: folders.map((f) => ({ name: f.name, sortOrder: f.sort_order })),
        requests: requestsWithTests
      }
    };
  }

  /**
   * Imports a native API FORGE collection into a workspace with transactional safety.
   */
  static importNativeCollection(workspaceId, data, customDb = null) {
    if (!data || data.schemaVersion !== 'api-forge/v1' || !data.collection?.name) {
      throw new Error('Invalid collection format. Expected schemaVersion "api-forge/v1".');
    }

    const db = customDb || getDatabase();
    const ws = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(workspaceId);
    if (!ws) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const now = new Date().toISOString();
    const newCollectionId = `col-${crypto.randomUUID()}`;

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newCollectionId, workspaceId, data.collection.name, data.collection.description || '', now, now);

      // Create folders and build name -> id map
      const folderMap = new Map();
      if (Array.isArray(data.collection.folders)) {
        for (const f of data.collection.folders) {
          const folderId = `fld-${crypto.randomUUID()}`;
          db.prepare(`
            INSERT INTO folders (id, collection_id, name, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(folderId, newCollectionId, f.name, f.sortOrder || 0, now);
          folderMap.set(f.name, folderId);
        }
      }

      // Create requests and test cases
      let importedRequests = 0;
      let importedAssertions = 0;

      if (Array.isArray(data.collection.requests)) {
        for (let i = 0; i < data.collection.requests.length; i++) {
          const req = data.collection.requests[i];
          const newReqId = `req-${crypto.randomUUID()}`;
          const folderId = req.folderName ? folderMap.get(req.folderName) || null : null;

          db.prepare(`
            INSERT INTO requests (
              id, collection_id, folder_id, name, description, method, url_template,
              headers_json, query_params_json, body_type, body_template, auth_configuration_json,
              request_settings_json, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newReqId,
            newCollectionId,
            folderId,
            req.name || 'Imported Request',
            req.description || '',
            req.method || 'GET',
            req.urlTemplate || 'http://127.0.0.1:5000',
            JSON.stringify(req.headers || []),
            JSON.stringify(req.queryParams || []),
            req.bodyType || 'none',
            req.bodyTemplate || null,
            JSON.stringify(req.auth || { type: 'none' }),
            JSON.stringify(req.settings || {}),
            i + 1,
            now,
            now
          );
          importedRequests++;

          if (Array.isArray(req.testCases)) {
            for (let j = 0; j < req.testCases.length; j++) {
              const tc = req.testCases[j];
              db.prepare(`
                INSERT INTO test_cases (
                  id, request_id, name, assertion_type, assertion_target, expected_value_json,
                  is_enabled, sort_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                `tc-${crypto.randomUUID()}`,
                newReqId,
                tc.name || 'Assertion',
                tc.assertionType || 'status_equals',
                tc.assertionTarget || null,
                String(tc.expectedValue ?? '200'),
                tc.isEnabled !== false ? 1 : 0,
                j + 1,
                now,
                now
              );
              importedAssertions++;
            }
          }
        }
      }

      db.exec('COMMIT;');

      return {
        success: true,
        collectionId: newCollectionId,
        importedRequests,
        importedAssertions
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Imports a Postman Collection v2.1.
   * Extracts requests, headers, query params, and body. Gracefully skips executable scripts.
   */
  static importPostmanCollection(workspaceId, postmanJson, customDb = null) {
    if (!postmanJson || !postmanJson.info || !postmanJson.item) {
      throw new Error('Invalid Postman Collection format. Expected info and item properties.');
    }

    const db = customDb || getDatabase();
    const now = new Date().toISOString();
    const newCollectionId = `col-${crypto.randomUUID()}`;
    const colName = postmanJson.info.name || 'Imported Postman Collection';
    const colDesc = postmanJson.info.description || 'Imported from Postman v2.1 format';

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO collections (id, workspace_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newCollectionId, workspaceId, colName, colDesc, now, now);

      let importedRequests = 0;
      let skippedScripts = 0;

      const processItem = (item, folderId = null) => {
        // Folder check
        if (item.item && Array.isArray(item.item)) {
          const newFolderId = `fld-${crypto.randomUUID()}`;
          db.prepare(`
            INSERT INTO folders (id, collection_id, name, sort_order, created_at)
            VALUES (?, ?, ?, 0, ?)
          `).run(newFolderId, newCollectionId, item.name || 'Folder', now);

          for (const subItem of item.item) {
            processItem(subItem, newFolderId);
          }
          return;
        }

        // Request item
        if (item.request) {
          const req = item.request;
          const method = req.method ? req.method.toUpperCase() : 'GET';
          
          let rawUrl = '';
          if (typeof req.url === 'string') {
            rawUrl = req.url;
          } else if (req.url && req.url.raw) {
            rawUrl = req.url.raw;
          }

          // Headers
          const headers = (req.header || []).map((h) => ({
            key: h.key,
            value: h.value,
            enabled: !h.disabled
          }));

          // Query params
          const queryParams = (req.url?.query || []).map((q) => ({
            key: q.key,
            value: q.value,
            enabled: !q.disabled
          }));

          // Body
          let bodyType = 'none';
          let bodyTemplate = null;
          if (req.body) {
            if (req.body.mode === 'raw') {
              bodyType = 'json';
              bodyTemplate = req.body.raw;
            } else if (req.body.mode === 'urlencoded') {
              bodyType = 'urlencoded';
              bodyTemplate = (req.body.urlencoded || [])
                .map((u) => `${encodeURIComponent(u.key)}=${encodeURIComponent(u.value)}`)
                .join('&');
            }
          }

          if (item.event && item.event.some((e) => e.listen === 'test' || e.listen === 'prerequest')) {
            skippedScripts++;
          }

          const reqId = `req-${crypto.randomUUID()}`;
          db.prepare(`
            INSERT INTO requests (
              id, collection_id, folder_id, name, description, method, url_template,
              headers_json, query_params_json, body_type, body_template, auth_configuration_json,
              request_settings_json, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            reqId,
            newCollectionId,
            folderId,
            item.name || 'Imported Request',
            req.description || '',
            method,
            rawUrl,
            JSON.stringify(headers),
            JSON.stringify(queryParams),
            bodyType,
            bodyTemplate,
            JSON.stringify({ type: 'none' }),
            JSON.stringify({}),
            importedRequests + 1,
            now,
            now
          );
          importedRequests++;
        }
      };

      for (const item of postmanJson.item) {
        processItem(item);
      }

      db.exec('COMMIT;');

      return {
        success: true,
        collectionId: newCollectionId,
        importedRequests,
        skippedScripts,
        message: `Imported ${importedRequests} requests successfully. ${skippedScripts > 0 ? `Note: ${skippedScripts} executable test/pre-request scripts were safely skipped in compliance with security requirements.` : ''}`
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
}
