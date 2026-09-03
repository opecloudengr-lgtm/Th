FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The browser calls this server itself at a relative /api/v1 path by
# default (see src/app/api/[...path]/route.ts) -- no build-time backend URL
# needed. Only set NEXT_PUBLIC_API_URL (inlined at build time, since it's a
# NEXT_PUBLIC_* var) if you specifically want the browser to bypass the
# proxy and call a backend directly.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Where the Next.js server proxies /api/* to -- set at container runtime,
# not build time, so the same image works in Docker Compose (service DNS
# name), Codespaces, or any other deployment without a rebuild.
ENV BACKEND_INTERNAL_URL="http://localhost:8000"

EXPOSE 3000
CMD ["node", "server.js"]
