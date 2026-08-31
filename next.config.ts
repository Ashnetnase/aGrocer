import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'src'],
  },
  /**
   * Emits a self-contained server bundle in `.next/standalone`, so the runtime
   * image carries only the traced dependencies instead of all of node_modules.
   */
  output: 'standalone',
  images: {
    /** TheMealDB recipe thumbnails, the only external image host a meal's `image` can carry. */
    remotePatterns: [{ protocol: 'https', hostname: 'www.themealdb.com', pathname: '/images/**' }],
  },
};

export default nextConfig;
