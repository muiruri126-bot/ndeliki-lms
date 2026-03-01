#!/bin/sh
set -e

# In production, use the volume-mounted path for SQLite
if [ "$NODE_ENV" = "production" ]; then
  export DATABASE_URL="file:/data/ndeliki.db"
fi

echo "DATABASE_URL=$DATABASE_URL"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database (if needed)..."
npx prisma db seed || echo "Seeding skipped or already done."

echo "Starting server..."
node dist/index.js
