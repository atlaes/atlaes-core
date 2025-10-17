import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { securityHeaders } from './middleware/security';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
import { logger } from './utils/logger';
import { env } from './utils/env';

// Import routes
import health from './routes/health';
import auth from './routes/auth';
import users from './routes/users';

const app = new Hono();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', securityHeaders);
app.use('*', requestLogger);
app.use('*', rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('*', errorHandler);

// Routes
app.route('/api/health', health);
app.route('/api/auth', auth);
app.route('/api/users', users);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'VBL Unified Platform API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: c.req.path,
    },
    404
  );
});

// Start server (both development and production)
const port = env.PORT || 3001;
logger.info(`Starting server on port ${port}`);

// Start the server using Node.js built-in server
const { serve } = require('@hono/node-server');
serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`🚀 Server running at http://localhost:${port}`);
console.log(`📊 Health check: http://localhost:${port}/api/health`);

export default app;
