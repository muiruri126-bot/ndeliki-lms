# ── Single-stage build (memory-efficient for Railway free tier) ──
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Upgrade npm to fix "Invalid Version" bug in npm 10.8.x
RUN npm install -g npm@10.9.2

# Build frontend (skip lock file — let npm resolve fresh)
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --ignore-scripts
COPY frontend/ ./
RUN npm run build

# Clean up frontend node_modules to free memory
RUN rm -rf node_modules

# Build backend (skip lock file — let npm resolve fresh)
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npx tsc

# Move frontend build into backend's public directory
RUN mv /app/frontend/dist /app/backend/public

# Make start script executable
RUN chmod +x start.sh

# Create data directory for SQLite volume
RUN mkdir -p /data

WORKDIR /app/backend

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["sh", "start.sh"]
