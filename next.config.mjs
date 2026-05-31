/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API request body size limit to 10mb
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;