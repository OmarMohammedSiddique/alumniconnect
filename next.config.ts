import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "onnxruntime-common"],
  outputFileTracingIncludes: {
    "/api/match/compare": [
      "./ml/models/scratch-v3/encoder.onnx",
      "./ml/models/scratch-v3/tokenizer.json",
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

// Source maps are uploaded only where the Vercel integration provides
// SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT. Local and CI builds skip it.
export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
});
