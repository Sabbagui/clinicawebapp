/** @type {import('next').NextConfig} */
const internalApiOrigin = process.env.INTERNAL_API_URL || 'http://backend:3001';
const publicApiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: publicApiBase,
  },
  async rewrites() {
    return [
      {
        // Browser -> Next frontend (/api/*) -> backend interno Docker.
        source: '/api/:path*',
        destination: `${internalApiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
