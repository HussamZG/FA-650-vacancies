import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-0d4ca3e2-8eae-4140-acff-346e0c63758e.space.z.ai",
    ".space.z.ai",
  ],
};

export default nextConfig;
