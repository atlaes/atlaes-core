/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
  // Disable static generation for pages using React Context
  generateBuildId: async () => {
    return 'build-id'
  },
}

module.exports = nextConfig
