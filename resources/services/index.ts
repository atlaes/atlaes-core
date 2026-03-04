import { cluster } from '../network';
import { postgres } from '../database';
import { bucket } from '../storage';

export const backend = new sst.aws.Service('AtlaesBackend', {
  cluster,
  image: {
    context: 'packages/functions',
    dockerfile: 'Dockerfile',
  },
  link: [postgres, bucket],
  environment: {
    FRONTEND_URL: $app.stage === 'production'
      ? 'https://vbl.atlaes.de'
      : 'https://staging.vbl.atlaes.de',
    JWT_SECRET: 'a-proper-32-char-minimum-secret-for-staging-env',
    NODE_ENV: 'production',
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
