import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "onnxruntime-common"],
  outputFileTracingIncludes: {
    "/api/match/compare": [
      "./ml/models/scratch-pilot-v1/encoder.onnx",
      "./node_modules/onnxruntime-node/**/*",
      "./node_modules/onnxruntime-common/**/*",
    ],
    "/api/embed": [
      "./node_modules/onnxruntime-node/**/*",
      "./node_modules/onnxruntime-common/**/*",
    ],
  },
  // OAuth codes must not appear in development request logs.
  logging: { incomingRequests: { ignore: [/^\/auth\/callback(?:[/?]|$)/] } },
};

export default nextConfig;
