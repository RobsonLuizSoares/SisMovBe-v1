import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sismovbe/types', '@sismovbe/labels'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
