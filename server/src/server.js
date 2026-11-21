import { createApp } from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './database/migrationRunner.js';
import { seedDemoData } from './database/seeds/001_demo_seed.js';
import { closeDatabase } from './database/connection.js';

async function bootstrap() {
  console.log('---------------------------------------------------------');
  console.log('       API FORGE — Integrated API Engineering Platform     ');
  console.log('               Build. Test. Debug. Master.              ');
  console.log('---------------------------------------------------------');

  try {
    // 1. Run migrations
    console.log('[Startup] Verifying database migrations...');
    runMigrations();

    // 2. Seed initial demo lab if database is fresh
    console.log('[Startup] Verifying demonstration data...');
    seedDemoData();

    // 3. Initialize Express application
    const app = createApp();

    // 4. Bind HTTP server to loopback address by default
    const server = app.listen(config.port, config.host, () => {
      console.log(`[Startup] Server running in ${config.env} mode.`);
      console.log(`[Startup] Backend API:       http://${config.host}:${config.port}/api/v1/health`);
      console.log(`[Startup] Demonstration API: http://${config.host}:${config.port}/demo/v1/students`);
      console.log(`[Startup] Mock Dispatcher:   http://${config.host}:${config.port}/mock/demo/users`);
      console.log(`[Startup] Client Proxy URL:  ${config.clientUrl}`);
      console.log('---------------------------------------------------------');
    });

    // Graceful shutdown handling
    const shutdown = (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);
      server.close(() => {
        closeDatabase();
        console.log('[Shutdown] Server and database closed. Clean exit.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Startup Fatal Error]:', err);
    process.exit(1);
  }
}

bootstrap();
