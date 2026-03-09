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
    // Load .env file so env vars are available in resource definitions
    const { readFileSync } = await import('fs');
    try {
      const envContent = readFileSync('.env', 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {}
    const web =  await import('./resources/web');

    // Import in dependency order: network -> database -> storage -> services -> web
    if($app.stage === "staging"){
    await import('./resources/network');
    await import('./resources/database');
    const { bucket } = await import('./resources/storage');
    await import('./resources/services');
    }

    return {
      web: web.atlaesWebsite.url,
    }
  },
});
