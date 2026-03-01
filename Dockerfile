# ── Stage 1: Build frontend ────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ─────────────────────────────
FROM node:20-alpine AS backend-build

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npx tsc

# ── Stage 3: Production image ──────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend dist + node_modules + prisma
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/start.sh ./start.sh

# Copy frontend build output into backend's public directory
COPY --from=frontend-build /app/frontend/dist ./public

# Make start script executable
RUN chmod +x start.sh

# Create data directory for SQLite (will be mounted as volume)
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "start.sh"]
