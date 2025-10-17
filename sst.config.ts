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
    // Static site deployment (recommended for corporate websites)
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
  },
});

// export default {
//   config(_input) {
//     return {
//       name: 'atlaes-corporate-website',
//       region: 'eu-central-1', // Frankfurt
//     };
//   },
//   async stacks(app) {
//     // Import SST v3 constructs dynamically
//     const { NextjsSite } = await import('sst');

//     app.stack(function Site({ stack }) {
//       // ATLAES Corporate Website
//       const site = new NextjsSite(stack, 'AtlaesWebsite', {
//         path: 'apps/web',
//         environment: {
//           NODE_ENV: process.env.NODE_ENV || 'production',
//         },
//         customDomain: {
//           domainName: 'atlaes.de',
//           hostedZone: 'atlaes.de',
//         },
//       });

//       stack.addOutputs({
//         WebsiteUrl: site.url,
//         CustomDomain: 'atlaes.de',
//       });
//     });
//   },
// };
