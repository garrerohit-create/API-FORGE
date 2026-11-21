import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(customDb = null) {
  const db = customDb || getDatabase();
  const migrationsDir = path.resolve(__dirname, 'migrations');

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const applied = new Set(appliedRows.map((r) => r.version));

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (!applied.has(version)) {
      console.log(`[Database Migration] Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      // Execute within transaction
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
        db.exec('COMMIT;');
        console.log(`[Database Migration] Applied: ${file}`);
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error(`[Database Migration Error] Failed to apply ${file}:`, err);
        throw err;
      }
    }
  }

  return true;
}

// Allow direct CLI invocation: node migrationRunner.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runMigrations();
    console.log('[Database Migration] All migrations are up to date.');
    process.exit(0);
  } catch (err) {
    console.error('[Database Migration] Migration process failed:', err);
    process.exit(1);
  }
}
