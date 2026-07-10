# syntax=docker/dockerfile:1
# Production image for the TFTLab Next.js site (VPS/Docker). Multi-stage:
# deps → build (standalone) → minimal runner that migrates + starts the server.

# ---- deps -------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# The postinstall script runs `prisma generate`, which needs the schema — copy
# it before `npm ci` so the install doesn't fail on a missing schema.
COPY prisma ./prisma
RUN npm ci

# ---- builder ----------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Git doesn't track empty dirs, so public/ may be absent; ensure it exists so the
# runner's `COPY /app/public` never fails.
RUN mkdir -p public

# NEXT_PUBLIC_* are inlined at build time → passed as build args.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_NOINDEX
ARG NEXT_PUBLIC_STRIPE_LINK_MONTH
ARG NEXT_PUBLIC_STRIPE_LINK_YEAR
ARG NEXT_PUBLIC_MP_LINK_MONTH
ARG NEXT_PUBLIC_MP_LINK_YEAR
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_NOINDEX=$NEXT_PUBLIC_NOINDEX \
    NEXT_PUBLIC_STRIPE_LINK_MONTH=$NEXT_PUBLIC_STRIPE_LINK_MONTH \
    NEXT_PUBLIC_STRIPE_LINK_YEAR=$NEXT_PUBLIC_STRIPE_LINK_YEAR \
    NEXT_PUBLIC_MP_LINK_MONTH=$NEXT_PUBLIC_MP_LINK_MONTH \
    NEXT_PUBLIC_MP_LINK_YEAR=$NEXT_PUBLIC_MP_LINK_YEAR \
    NEXT_PUBLIC_MP_PUBLIC_KEY=$NEXT_PUBLIC_MP_PUBLIC_KEY

# Standalone output; the DB is NOT needed at build (DB-touching pages are
# resilient and fill in via ISR at runtime). A dummy URL satisfies Prisma init.
ENV DOCKER_BUILD=1
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV DATABASE_URL_UNPOOLED="postgresql://build:build@127.0.0.1:5432/build"
RUN npx prisma generate
RUN npm run build

# ---- runner -----------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Next standalone binds to $HOSTNAME; Docker defaults it to the container id, so
# it would listen only on that interface. Force 0.0.0.0 so nginx (and loopback)
# can reach it.
ENV HOSTNAME=0.0.0.0

# Standalone server bundle + static assets + public.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + migrations (+ seed-users.cjs) for `migrate deploy` on start.
COPY --from=builder /app/prisma ./prisma
# Full node_modules overlays the standalone's minimal set so the Prisma CLI can
# run at startup — it needs its whole dependency tree (@prisma/config, effect, …),
# not just the prisma package. Also brings the generated client, engines and
# bcryptjs (used by prisma/seed-users.cjs).
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
# Run the Prisma CLI via its real path (not the .bin symlink, which Docker
# flattens into a plain file and then can't find its sibling *.wasm files).
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
