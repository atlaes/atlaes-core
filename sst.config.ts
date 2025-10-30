/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'atlaes',
      region: 'eu-central-1', // Frankfurt
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      // protect: ['production'].includes(input?.stage), // Temporarily disabled for cleanup
      home: 'aws',
    };
  },
  async run() {
    // VPC for backend services
    const vpc = new sst.aws.Vpc('AtlaesVpc');

    // ECS Cluster for backend services
    const cluster = new sst.aws.Cluster('AtlaesCluster', { vpc });

    // PostgreSQL Database
    const postgres = new sst.aws.Postgres('AtlaesDatabase', {
      vpc,
      proxy: true,
      dev: {
        username: 'vbl_user',
        password: 'vbl_password',
        database: 'vbl_development',
        port: 5432,
        host: 'localhost',
      },
    });

    // Backend API Service (Hono.js)
    const backend = new sst.aws.Service('AtlaesBackend', {
      cluster,
      image: {
        context: 'packages/functions',
        dockerfile: 'Dockerfile',
      },
      link: [postgres],
      loadBalancer: {
        rules: [{ listen: '80/http' }],
      },
    });

    // VBL Next.js App
    const vblApp = new sst.aws.Nextjs('VBLApp', {
      path: 'apps/vbl',
      environment: {
        API_URL: backend.url,
      },
      link: [postgres],
    });

    // Static site deployment (corporate website)
    new sst.aws.StaticSite('AtlaesWebsite', {
      path: 'apps/web',
      build: {
        command: 'pnpm build',
        output: 'dist',
      },
      dev: {
        command: 'pnpm dev',
        title: 'Atlaes Website',
        url: 'http://localhost:5173',
      },
      domain: 'atlaes.de',
    });

    return {
      backend: backend.url,
      vblApp: vblApp.url,
    };
  },
});
