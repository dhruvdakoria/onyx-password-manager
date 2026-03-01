import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onyx — Your Intelligent Vault",
  description: "The most beautiful, secure, and intuitive password manager. Zero-knowledge encryption.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onyx Vault",
  },
  openGraph: {
    title: "Onyx — Your Intelligent Vault",
    description: "Zero-knowledge password manager with beautiful design.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#111114",
          colorInputBackground: "#1a1a20",
          colorInputText: "#f4f4f5",
          fontFamily: "Inter, -apple-system, sans-serif",
          borderRadius: "12px",
          colorText: "#f4f4f5",
          colorTextSecondary: "#8a8a9a",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </head>
        <body>
          <StoreProvider>
            {children}
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
