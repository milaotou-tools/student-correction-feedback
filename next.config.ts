import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/reports": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
      "./node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
      "./node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff2"
    ],
    "/api/reports/**/*": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
      "./node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
      "./node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff2"
    ]
  }
};

export default nextConfig;
