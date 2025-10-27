import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '../../.env' });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3001'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
