/** @type {import('next').NextConfig} */

// Same variable as lib/backend.js. Default = the docker compose service name.
// Outside Docker, set BACKEND_URL=http://127.0.0.1:8000 (e.g. in nextjs/.env.local).
const API_URL = process.env.BACKEND_URL || "http://backend-api:8000";

const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // static export cannot serve pages/api or rewrites
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: 'http://backend-api:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
