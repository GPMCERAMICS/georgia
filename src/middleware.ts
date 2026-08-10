import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Next 16 deprecates middleware.ts in favour of proxy.ts, but Convex Auth only
// ships a middleware.ts helper. Renaming the file silently drops admin auth,
// so we stay on the deprecated-but-working filename until Convex Auth ships a
// proxy entrypoint.
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isSignInRoute = createRouteMatcher(["/admin/signin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (
    isAdminRoute(request) &&
    !isSignInRoute(request) &&
    !(await convexAuth.isAuthenticated())
  ) {
    return nextjsMiddlewareRedirect(request, "/admin/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
