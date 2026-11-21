/**
 * Structured request logger middleware for API FORGE server.
 */
export function requestLogger(req, res, next) {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(2);
    // Don't log health pings repeatedly to avoid log clutter
    if (req.path === '/api/v1/health') return;

    console.log(
      `[${timestamp}] ${req.method.padEnd(7)} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}
