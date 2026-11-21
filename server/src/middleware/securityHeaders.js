import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config/index.js';

export function configureSecurityMiddleware(app) {
  // Helmet with custom CSP allowing local assets and safe preview
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  // Restricted CORS
  const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${config.port}`,
    `http://127.0.0.1:${config.port}`
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman, same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by API FORGE CORS policy`), false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Workspace-Id'],
      credentials: true,
      maxAge: 86400
    })
  );

  // Enforce JSON content-type for state-changing management API requests
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api/v1') &&
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      req.headers['content-length'] &&
      Number(req.headers['content-length']) > 0
    ) {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        return res.status(415).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Management API requests with body must use Content-Type: application/json'
          }
        });
      }
    }
    next();
  });
}
