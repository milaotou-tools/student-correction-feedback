import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/student-correction-feedback",
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/reports": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@fontsource/noto-sans-sc/400.css",
      "./node_modules/@fontsource/noto-sans-sc/files/*-400-normal.woff2"
    ],
    "/api/reports/**/*": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@fontsource/noto-sans-sc/400.css",
      "./node_modules/@fontsource/noto-sans-sc/files/*-400-normal.woff2"
    ]
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/student-correction-feedback",
        permanent: false,
        basePath: false
      }
    ];
  }
};

export default nextConfig;
