# syntax=docker/dockerfile:1.4
# Talos Dashboard - Dockerfile
# Multi-stage build for Next.js
# Build context: deploy/repos (to include talos-contracts as sibling)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy contracts first (needed for file: dependency)
COPY talos-contracts/typescript ../talos-contracts/typescript

# Copy dashboard package files
COPY talos-dashboard/package.json talos-dashboard/package-lock.json* ./

# Build contracts first
WORKDIR /talos-contracts/typescript
RUN npm ci && npm run build

# Install dashboard dependencies
WORKDIR /app
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy contracts (for imports)
COPY --from=deps /talos-contracts /talos-contracts

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy dashboard source
COPY talos-dashboard/ .

# Re-link local contracts package (symlink breaks when copied between stages)
RUN cd /talos-contracts/typescript && npm link && cd /app && npm link @talosprotocol/contracts

# Set production environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.licenses="Apache-2.0"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
