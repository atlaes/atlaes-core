import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '../../.env' });

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .optional()
    .default(
      'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development'
    ),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('your-super-secret-jwt-key-change-this-in-production'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3001'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
