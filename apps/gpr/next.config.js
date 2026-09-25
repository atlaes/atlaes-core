/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
  // Disable static generation for pages using React Context
  generateBuildId: async () => {
    return 'build-id';
  },
  // Don't fail build on lint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Launch 301 map (item 17). Next.js forwards the query string of the
   * request when the destination has none, so `?via=…`, `utm_*`, `gclid`
   * and `fbclid` survive the redirect. Host-based rules (EN_ONLY on `de.`)
   * live in middleware.ts.
   */
  async redirects() {
    return [
      // Every "Claim Refund" CTA → the intake-flow entry.
      {
        source: '/get-your-refund',
        destination: '/check/3-step',
        permanent: true,
      },
      // Marketing calculator slug → the existing calculator until the
      // marketing page is built (temporary on purpose).
      {
        source: '/refund-calculator',
        destination: '/calculator',
        permanent: false,
      },
      // The four ex-Yugoslav pages merge into one combined page.
      {
        source: '/bosnia-herzegovina',
        destination: '/former-yugoslavia#bosnia-herzegovina',
        permanent: true,
      },
      {
        source: '/kosovo',
        destination: '/former-yugoslavia#kosovo',
        permanent: true,
      },
      {
        source: '/montenegro',
        destination: '/former-yugoslavia#montenegro',
        permanent: true,
      },
      {
        source: '/serbia',
        destination: '/former-yugoslavia#serbia',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
