import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files (including .json for manifest)
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|sw\\.js)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
