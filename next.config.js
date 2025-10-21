/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright']
  },
  webpack: (config) => {
    config.externals.push({
      'playwright': 'commonjs playwright'
    });
    return config;
  }
}

module.exports = nextConfig
