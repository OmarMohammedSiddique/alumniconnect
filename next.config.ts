import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth codes must not appear in development request logs.
  logging: { incomingRequests: { ignore: [/^\/auth\/callback(?:[/?]|$)/] } },
};

export default nextConfig;
