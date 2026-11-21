import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { configureSecurityMiddleware } from './middleware/securityHeaders.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { handleMockDispatch } from './services/mockDispatchService.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import executionRoutes from './routes/executionRoutes.js';
import mockRoutes from './routes/mockRoutes.js';
import environmentRoutes from './routes/environmentRoutes.js';
import testRoutes from './routes/testRoutes.js';
import runnerRoutes from './routes/runnerRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import importExportRoutes from './routes/importExportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import codeGenRoutes from './routes/codeGenRoutes.js';

export function createApp() {
  const app = express();

  // 1. Security Headers & CORS
  configureSecurityMiddleware(app);

  // 2. Request Logger
  app.use(requestLogger);

  // 3. Body Parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.text({ limit: '2mb', type: ['text/plain', 'text/html'] }));

  // 4. API Management Routes (/api/v1)
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1/workspaces', workspaceRoutes);
  app.use('/api/v1', collectionRoutes);
  app.use('/api/v1', folderRoutes);
  app.use('/api/v1', requestRoutes);
  app.use('/api/v1/executions', executionRoutes);
  app.use('/api/v1', mockRoutes);
  app.use('/api/v1', environmentRoutes);
  app.use('/api/v1', testRoutes);
  app.use('/api/v1', runnerRoutes);
  app.use('/api/v1', analyticsRoutes);
  app.use('/api/v1', historyRoutes);
  app.use('/api/v1', docsRoutes);
  app.use('/api/v1', importExportRoutes);
  app.use('/api/v1', settingsRoutes);
  app.use('/api/v1/codegen', codeGenRoutes);

  // 5. Functional Demonstration CRUD API (/demo/v1/students)
  app.use('/demo/v1/students', studentRoutes);

  // 6. Dynamic Mock Endpoint Engine (/mock/:workspaceSlug/*)
  app.all('/mock/:workspaceSlug*', handleMockDispatch);

  // 7. Production Static Client Serving (with safe SPA fallback)
  const clientDist = path.resolve(process.cwd(), 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    // Client-side SPA routing fallback (excludes /api, /demo, /mock)
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/demo') ||
        req.path.startsWith('/mock')
      ) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 8. 404 handler for unmatched API routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
      }
    });
  });

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
