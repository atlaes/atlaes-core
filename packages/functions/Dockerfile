# Multi-stage build for Hono backend
FROM node:20-alpine AS base


# Install production dependencies only
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
RUN npm ci

# Copy source code and build script
COPY src ./src
COPY drizzle.config.ts ./
COPY build.js ./

# Build the application with esbuild (much faster and less memory intensive than tsc)
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy built application
COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/package.json ./package.json

USER hono

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
