import { NextRequest, NextResponse } from "next/server";

// Proxies the browser's same-origin /api/* calls to the real backend
// server-side. Unlike `next.config.ts` `rewrites()`, this reads
// `BACKEND_INTERNAL_URL` fresh on every request instead of baking it into
// the build output -- required for `output: "standalone"` Docker images,
// where rewrites() is resolved once at `next build` time (before Docker
// Compose / Codespaces ever set the runtime env var) and frozen into
// routes-manifest.json. A Route Handler runs at request time, so the same
// built image works unchanged wherever BACKEND_INTERNAL_URL points --
// `http://backend:8000` in Docker Compose, `http://localhost:8000` in local
// dev, or any other host in a split deployment -- with no rebuild.
function backendUrl() {
  return process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";
}

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "transfer-encoding",
  "content-length",
]);

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const target = `${backendUrl()}/api/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);

  let backendRes: Response;
  try {
    backendRes = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      // @ts-expect-error -- Node's fetch requires this for streaming bodies
      duplex: hasBody ? "half" : undefined,
    });
  } catch (err) {
    console.error(`[api proxy] failed to reach backend at ${target}:`, err);
    return NextResponse.json(
      { detail: "Backend unreachable. Is it running and is BACKEND_INTERNAL_URL correct?" },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const body = await backendRes.arrayBuffer();
  return new NextResponse(body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
