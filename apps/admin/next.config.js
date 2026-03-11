/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
  generateBuildId: async () => {
    return 'build-id';
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
