/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  experimental: {
    largePageDataBytes: 128 * 100000, // Increase the limit to ~12.8MB
  },
}

module.exports = nextConfig 