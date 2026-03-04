import type { Config } from 'drizzle-kit';

export default {
  schema: './src/drizzle/schema/*',
  out: './src/drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ||
      'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development',
  },
  schemaFilter: ['public', 'shared', 'gpr', 'claims', 'vbl'],
  verbose: true,
  strict: true,
} satisfies Config;
