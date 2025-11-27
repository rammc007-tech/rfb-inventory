/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Output configuration for Netlify
  output: 'standalone',
}

module.exports = nextConfig

