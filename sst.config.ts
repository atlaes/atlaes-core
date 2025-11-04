/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'atlaes',
      region: 'eu-central-1', // Frankfurt
      // removal: input?.stage === 'production' ? 'retain' : 'remove',
      // protect: ['production'].includes(input?.stage), // Temporarily disabled for cleanup
      home: 'aws',
    };
  },
  async run() {
    // Import in dependency order: network -> database -> services -> web
    await import('./resources/network');
    await import('./resources/database');
    await import('./resources/services');
    await import('./resources/web');
  },
});
