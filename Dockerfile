# Agrocer image (Stage 2).
#
# Multi-stage so the runtime layer carries only the standalone server output and
# the public assets — no source, no dev dependencies, no package manager.
#
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`, so they are BUILD
# arguments, not runtime environment. An image built with the wrong ones cannot be corrected
# by restarting the container with different variables — it has to be rebuilt. Everything
# secret (DATABASE_URL, SUPABASE_SECRET_KEY, AGROCER_HOUSEHOLD_ID) is runtime-only and never
# appears here, so it cannot be baked into an image layer.

# ---- deps -------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Copy only the manifests first: this layer is cached until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Supplied by docker-compose from the deploying host's environment. The publishable key is
# public by design (ADR-016) — RLS is what makes that safe — so baking it into the client
# bundle is correct rather than a leak.
#
# NEXT_PUBLIC_AGROCER_SERVER_DATA belongs here too, not in docker-compose.yml's `environment:`
# block: every NEXT_PUBLIC_* value is inlined into the client bundle at `next build`, so setting
# it as a *runtime* container variable has no effect at all — the compiled JS already has
# whatever was true here baked in. This was missing for a real deploy or two, silently leaving
# the shipped app on localStorage regardless of what the container's environment said.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_AGROCER_SERVER_DATA
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_AGROCER_SERVER_DATA=$NEXT_PUBLIC_AGROCER_SERVER_DATA

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner -----------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. node:alpine already ships uid/gid 1000 as `node`.
USER node

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# No shell in the healthcheck: this image has no curl, and node is already here.
#
# Checks /sign-in rather than /. With auth enforced (ADR-017) / redirects, and a health check
# whose result depends on redirect-following is one that will surprise somebody later.
# /sign-in is reachable signed out by design and still exercises the full render path.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/sign-in').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
