// import { postgres } from '../database';


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
    NEXT_PUBLIC_API_URL: $app.stage === 'production' ? 'https://api.atlaes.de' : 'https://staging.api.atlaes.de',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    STRIPE_SECRET_KEY: $app.stage === 'production' ? 'to be in secrete' : 'sk_test_51SRpwnD86goZexmM9XSBC97ERit2aUg4XOg0TGNvag9Zhzugx7NyChKTU0AubwFyrvIHtveGkd6AnjyytKpVlQWB00s9zr78UR',
    STRIPE_PUBLISHABLE_KEY: $app.stage === 'production' ? 'to be in secrete' : 'pk_test_51SRpwnD86goZexmM9tsfY1Zxlbi5W608FPL1syOFOiV2yjFco2tDyg9NwGA264oCvHuga92qWLy7CKeCvB9tjcDe00zZYwuPZQ',
  },
  domain:
  $app.stage === 'production'
      ? 'vbl.atlaes.de'
      : 'staging.vbl.atlaes.de',
});

// Germany Pension Refund site + funnel + client account (apps/gpr). Re-enabled
// 29 Sep 2026 now that the marketing pages, account area and lead capture
// exist; production later moves to www.germanypensionrefund.com.
export const gprApp = new sst.aws.Nextjs('GPRApp', {
  path: 'apps/gpr',
  environment: {
    NEXT_PUBLIC_API_URL:
      $app.stage === 'production'
        ? 'https://api.atlaes.de'
        : 'https://staging.api.atlaes.de',
    NEXT_PUBLIC_SITE_URL:
      $app.stage === 'production'
        ? 'https://www.germanypensionrefund.com'
        : 'https://staging.gpr.atlaes.de',
  },
  domain:
    $app.stage === 'production' ? 'gpr.atlaes.de' : 'staging.gpr.atlaes.de',
});

export const adminApp = new sst.aws.Nextjs('AdminApp', {
  path: 'apps/admin',
  environment: {
    NEXT_PUBLIC_API_URL:
      $app.stage === 'production'
        ? 'https://api.atlaes.de'
        : 'https://staging.api.atlaes.de',
    STRIPE_SECRET_KEY: $app.stage === 'production' ? 'to be in secrete' : 'sk_test_51SRpwnD86goZexmM9XSBC97ERit2aUg4XOg0TGNvag9Zhzugx7NyChKTU0AubwFyrvIHtveGkd6AnjyytKpVlQWB00s9zr78UR',
    STRIPE_PUBLISHABLE_KEY: $app.stage === 'production' ? 'to be in secrete' : 'pk_test_51SRpwnD86goZexmM9tsfY1Zxlbi5W608FPL1syOFOiV2yjFco2tDyg9NwGA264oCvHuga92qWLy7CKeCvB9tjcDe00zZYwuPZQ',

  },
  domain:
    $app.stage === 'production'
      ? 'admin.atlaes.de'
      : 'staging.admin.atlaes.de',
});
