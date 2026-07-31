import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.240"],
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
