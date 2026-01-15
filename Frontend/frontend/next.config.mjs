/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups', // 🚀 Allows Google Auth to work
          },
        ],
      },
    ];
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = isDev ? 'http://localhost:5000' : 'https://zero-th.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`, 
      },
    ];
  },
};

export default nextConfig;