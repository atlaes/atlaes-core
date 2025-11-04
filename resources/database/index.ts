   import { vpc } from '../network';
   // PostgreSQL Database
export const postgres = new sst.aws.Postgres('AtlaesDatabase', {
      vpc,
      proxy: true,
      version: '16.6',
      dev: {
        username: 'vbl_user',
        password: 'vbl_password',
        database: 'vbl_development',
        port: 5432,
        host: 'localhost',
      },
    });