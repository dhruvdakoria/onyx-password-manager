import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/(.*)", // Clerk webhooks must be public
]);

export default clerkMiddleware(async (auth, req) => {
    // Rate limiting headers for API routes
    if (req.nextUrl.pathname.startsWith("/api/vault")) {
        const res = NextResponse.next();
        res.headers.set("X-RateLimit-Policy", "100;w=60"); // hint for Vercel edge
        return res;
    }

    // Protect non-public routes
    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|sw\\.js)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
