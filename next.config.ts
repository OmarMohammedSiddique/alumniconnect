import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["onnxruntime-node"],
  outputFileTracingIncludes: {
    "/api/match/compare": [
      "./ml/models/scratch-pilot-v1/encoder.onnx",
      "./node_modules/onnxruntime-node/bin/**/*",
    ],
    "/api/embed": [
      "./node_modules/onnxruntime-node/bin/**/*",
    ],
  },
  // OAuth codes must not appear in development request logs.
  logging: { incomingRequests: { ignore: [/^\/auth\/callback(?:[/?]|$)/] } },
};

export default nextConfig;
