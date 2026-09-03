import type { NextConfig } from "next";

// The browser always calls this same-origin server at /api/* -- it never
// talks to the backend directly. `src/app/api/[...path]/route.ts` proxies
// those requests server-side to the real backend, reading
// BACKEND_INTERNAL_URL at request time (not build time -- see that file for
// why a Route Handler is used here instead of `rewrites()`).
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
