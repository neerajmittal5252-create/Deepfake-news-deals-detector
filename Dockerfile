# Multi-stage Dockerfile for TrustCheck (Next.js 14 + Prisma SQLite)

# --- 1. Dependencies Stage ---
FROM node:20-alpine AS deps
WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma & Next.js on Alpine
RUN apk add --no-cache libc6-compat openssl

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# --- 2. Builder Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client for builder
RUN npx prisma generate

# Set Next.js telemetry to disabled during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js production build
RUN npm run build

# --- 3. Runner Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/prod.db"

# Create data directory for SQLite database storage
RUN mkdir -p /app/data

# Copy built application and production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/config ./config
COPY --from=builder /app/data ./data
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
