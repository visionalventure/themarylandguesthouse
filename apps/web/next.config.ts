import type { NextConfig } from 'next';

const isDocker = process.env.DOCKER_BUILD === '1';

const nextConfig: NextConfig = {
  // standalone output needed for Docker; Vercel manages its own output
  ...(isDocker ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
