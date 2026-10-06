/** @type {import('next').NextConfig} */

const API_URL = "http://backend-api:8000";

const nextConfig = {
  reactStrictMode: true,
  // output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;