import { cluster } from '../network';
import { postgres } from '../database';
import { bucket } from '../storage';
import { email } from '../email';

// Migration runner token. Gates POST /api/migrations/run, which CI/CD
// invokes after each staging deploy. Set per-stage via:
//   AWS_PROFILE=atlaes npx sst secret set AdminMigrationToken <value> --stage <stage>
const adminMigrationToken = new sst.Secret('AdminMigrationToken');

export const backend = new sst.aws.Service('AtlaesBackend', {
  cluster,
  image: {
    context: 'packages/functions',
    dockerfile: 'Dockerfile',
  },
  link: [postgres, bucket, email, adminMigrationToken],
  environment: {
    FRONTEND_URL: $app.stage === 'production'
      ? 'https://vbl.atlaes.de'
      : 'https://staging.vbl.atlaes.de',
    JWT_SECRET: 'a-proper-32-char-minimum-secret-for-staging-env',
    NODE_ENV: 'production',
    MINDEE_API: process.env.MINDEE_API ?? '',
    SES_FROM_EMAIL: 'noreply@companypension.de',
    STRIPE_SECRET_KEY: $app.stage === 'production'
      ? ''
      : 'sk_test_51SRpwnD86goZexmM9XSBC97ERit2aUg4XOg0TGNvag9Zhzugx7NyChKTU0AubwFyrvIHtveGkd6AnjyytKpVlQWB00s9zr78UR',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    ADMIN_MIGRATION_TOKEN: adminMigrationToken.value,
  },
  loadBalancer: {
    domain:
    $app.stage === 'production'
        ? 'api.atlaes.de'
        : 'staging.api.atlaes.de',
    ports: [
      { listen: '80/http', forward: '3001/http' },
      { listen: '443/https', forward: '3001/http' },
    ],
  },
});
