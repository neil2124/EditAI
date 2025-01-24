import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define protected routes
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)'])

// Define public routes that should not require authentication
const isPublicRoute = createRouteMatcher(['/api/webhooks/clerk'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return; // Skip authentication for public routes
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
