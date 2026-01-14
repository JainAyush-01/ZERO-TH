/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*', // When user hits /api/...
        destination: 'https://zero-th.onrender.com/:path*', // Go to Render
      },
    ];
  },
};

export default nextConfig;