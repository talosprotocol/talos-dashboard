# syntax=docker/dockerfile:1.4
# Talos Dashboard - Production Dockerfile
# Build context: . (Root of monorepo)

# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy contracts first (needed for file: dependency)
COPY contracts/typescript /contracts/typescript
COPY contracts/examples_manifest.json /contracts/examples_manifest.json

# Copy dashboard package files
COPY site/dashboard/package.json ./

# Build contracts first
WORKDIR /contracts/typescript
RUN npm install && npm run build

# Install dashboard dependencies
WORKDIR /app
RUN npm install

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder

ARG GIT_SHA=unknown
ARG VERSION=unknown

WORKDIR /app

# Copy contracts (for imports)
COPY --from=deps /contracts /contracts

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy dashboard source
COPY site/dashboard/ .

# Re-install contracts package (copy built package into node_modules)
RUN rm -rf node_modules/@talosprotocol/contracts && \
    mkdir -p node_modules/@talosprotocol/contracts && \
    cp -r /contracts/typescript/package.json node_modules/@talosprotocol/contracts/ && \
    cp -r /contracts/typescript/dist node_modules/@talosprotocol/contracts/

# Set production environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Remove local path aliases from tsconfig.json to ensure we use the installed node_module
RUN node scripts/clean-tsconfig.js

# Build with standalone output
RUN npm run build

# ========================================
# Stage 3: Production Runtime
# ========================================
FROM node:20-alpine AS runner

ARG GIT_SHA=unknown
ARG VERSION=unknown
ARG BUILD_TIME=unknown

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    GIT_SHA=${GIT_SHA} \
    VERSION=${VERSION} \
    BUILD_TIME=${BUILD_TIME}

# Create non-root user (Alpine Linux syntax)
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nextjs -G nodejs

# Copy built assets
COPY --from=deps /contracts/examples_manifest.json ./contracts/examples_manifest.json
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck using wget (alpine has wget by default)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:3000/readyz || exit 1

CMD ["node", "server.js"]

# OCI Labels
LABEL org.opencontainers.image.source="https://github.com/talosprotocol/talos" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="Apache-2.0"
