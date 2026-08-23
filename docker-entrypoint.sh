#!/bin/sh
set -e

echo "🚀 Starting TrustCheck Container..."

# Ensure database directory exists
mkdir -p /app/data

# Sync SQLite database schema with Prisma
echo "📦 Initializing SQLite Database via Prisma..."
npx prisma db push --skip-generate --accept-data-loss

# Seed initial baseline demo data if database is fresh
echo "🌱 Ensuring Baseline Demo Data is Seeded..."
npx tsx scripts/seed-demo-data.ts || true

# Determine port (Render dynamically sets $PORT)
APP_PORT="${PORT:-3000}"
echo "🌐 Starting Next.js Production Server on port ${APP_PORT}..."

exec npx next start -H 0.0.0.0 -p "${APP_PORT}"
