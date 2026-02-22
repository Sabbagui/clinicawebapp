/** @type {import('next').NextConfig} */
const internalApiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: internalApiOrigin,
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
