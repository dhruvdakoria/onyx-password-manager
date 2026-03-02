import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/(.*)", // Clerk webhooks must be public
]);

export default clerkMiddleware(async (auth, req) => {
    // Protect non-public routes
    if (!isPublicRoute(req)) {
        await auth.protect();
    }

    // MED-2: Generate a per-request nonce for CSP to replace unsafe-inline
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    // Build CSP with nonce instead of unsafe-inline for script-src
    const cspHeader = [
        "default-src 'self'",
        // MED-2: nonce + strict-dynamic replaces unsafe-inline for script-src
        // 'unsafe-inline' is kept as a fallback for CSP Level 2 browsers (ignored when nonce is present in CSP3+)
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.dev https://clerk.io https://js.clerk.dev https://challenges.cloudflare.com`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://www.google.com https://img.clerk.com https://*.googleusercontent.com",
        "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.supabase.co wss://*.supabase.co",
        "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
        "worker-src 'self' blob:",
        "frame-ancestors 'none'",
    ].join("; ");

    // Pass nonce to downstream via request header so layout.tsx can read it
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // Set CSP on the response
    response.headers.set("Content-Security-Policy", cspHeader);

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files (including .json for manifest)
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|sw\\.js)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};

