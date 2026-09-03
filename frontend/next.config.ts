import type { NextConfig } from "next";

// The browser always calls this same-origin server at /api/*  -- it never
// talks to the backend directly. That avoids two classes of failure that
// only show up once the frontend and backend are on different hosts (any
// cloud deploy, GitHub Codespaces, etc.): the browser being unable to
// resolve a hardcoded backend URL (e.g. "localhost:8000" means the
// browser's own machine, not the container/server it came from), and CORS
// rejecting cross-origin requests. This Next.js server proxies server-side
// to the real backend, which it *can* always reach (container networking,
// or plain localhost in dev), regardless of what URL the browser used to
// reach the frontend itself.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
