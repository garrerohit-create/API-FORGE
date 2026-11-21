import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || config.databasePath;
  
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(process.cwd(), dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const resolvedPath = dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath);
  const db = new DatabaseSync(resolvedPath);

  // Enable foreign key constraints and Write-Ahead Logging for high performance
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  dbInstance = db;

  return db;
}

export function setDatabase(db) {
  dbInstance = db;
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
}
