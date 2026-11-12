import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.convex.cloud" }],
    // Product photos come from the dashboard and may be SVGs. Next refuses
    // to serve SVG through the optimiser unless allowed; the two settings
    // below are its recommended guard (no scripts, never rendered as a page).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
