import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  poweredByHeader: false, // LOW-3
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Server", value: "Onyx/1.0" }, // LOW-1
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // MED-3
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // MED-2: CSP is now set per-request in middleware.ts with a nonce (no longer here)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
