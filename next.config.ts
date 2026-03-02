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
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // HIGH-3: removed unsafe-eval but kept unsafe-inline for Next.js hydration
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.dev https://clerk.io https://js.clerk.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://www.google.com https://img.clerk.com https://*.googleusercontent.com",
              // API calls: Clerk, Supabase, internal (HIBP proxied by MED-4 so we remove it from connect-src)
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.supabase.co wss://*.supabase.co",
              "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
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
