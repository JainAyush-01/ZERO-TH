/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 1. Define the target based on where the code is running
    // If we are in 'development' (npm run dev), use Localhost.
    // If we are in 'production' (Vercel), use Render.
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = isDev ? 'http://localhost:5000' : 'https://zero-th.onrender.com';

    console.log(`[Next.js] Proxying /api requests to: ${backendUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`, 
      },
    ];
  },
};

export default nextConfig;