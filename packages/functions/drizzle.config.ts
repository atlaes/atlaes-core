import type { Config } from 'drizzle-kit';

export default {
  schema: './src/drizzle/schema/*',
  out: './src/drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'vbl_user',
    password: 'vbl_password',
    database: 'vbl_development',
  },
  verbose: true,
  strict: true,
} satisfies Config;
