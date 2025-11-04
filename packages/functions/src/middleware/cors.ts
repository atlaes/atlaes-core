import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin, _c) => {
    // Allow localhost for development
    if (process.env.NODE_ENV === 'development') {
      return origin?.startsWith('http://localhost') ||
        origin?.startsWith('http://127.0.0.1')
        ? origin
        : null;
    }

    // Staging and Production origins
    const allowedOrigins = [
      // Production domains
      'https://vblrefund.com',
      'https://www.vblrefund.com',
      'https://admin.vblrefund.com',
      // Staging - allow localhost for testing with staging API
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
    ];

    return allowedOrigins.includes(origin || '') ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
