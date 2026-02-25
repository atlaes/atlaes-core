import { cluster } from '../network';
import { postgres } from '../database';

export const backend = new sst.aws.Service('AtlaesBackend', {
  cluster,
  image: {
    context: 'packages/functions',
    dockerfile: 'Dockerfile',
  },
  link: [postgres],
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
