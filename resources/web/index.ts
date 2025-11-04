import { postgres } from '../database';


export const atlaesWebsite = new sst.aws.StaticSite('AtlaesWebsite', {
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
  domain:
  $app.stage === 'production' ? 'atlaes.de' : 'staging.atlaes.de',
});

export const vblApp = new sst.aws.Nextjs('VBLApp', {
  path: 'apps/vbl',
  environment: {
    API_URL: $app.stage === 'production' ? 'https://api.atlaes.de' : 'https://staging.api.atlaes.de',
  },
  domain:
  $app.stage === 'production'
      ? 'vbl.atlaes.de'
      : 'staging.vbl.atlaes.de',
});
