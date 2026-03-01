import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: Clerk JS + Cloudflare Turnstile (CAPTCHA)
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.dev https://clerk.io https://js.clerk.dev https://challenges.cloudflare.com",
              // Styles: inline for Clerk + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts: Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Images: favicons, Clerk avatars, Google user images
              "img-src 'self' data: blob: https://www.google.com https://img.clerk.com https://*.googleusercontent.com",
              // API calls: Clerk, Supabase, HIBP (breach checks)
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.supabase.co wss://*.supabase.co https://api.pwnedpasswords.com https://api.haveibeenpwned.com",
              // Frames: Turnstile CAPTCHA loads in an iframe
              "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              // Workers: service worker
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
