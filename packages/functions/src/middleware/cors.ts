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

    // Production origins
    const allowedOrigins = [
      'https://vblrefund.com',
      'https://www.vblrefund.com',
      'https://admin.vblrefund.com',
    ];

    return allowedOrigins.includes(origin || '') ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
