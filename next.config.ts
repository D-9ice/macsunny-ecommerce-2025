import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    qualities: [70, 80],
    imageSizes: [48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
    minimumCacheTTL: 2_678_400,
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default nextConfig;
