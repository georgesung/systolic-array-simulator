import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
