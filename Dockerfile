# Multi-stage Dockerfile for ClaimClarity AI on Google Cloud Run
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build frontend and production assets
RUN npm run build

# Runtime Stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV STORAGE_MODE=FIRESTORE
ENV GOOGLE_CLOUD_PROJECT=gen-lang-client-0363908338
ENV FIRESTORE_DATABASE_ID=(default)

# Copy package dependencies and built application
COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server.js ./server.js
COPY --chown=node:node --from=builder /app/.demo-data.json ./.demo-data.json

# Ensure runtime directory permissions for non-root user node
RUN chown -R node:node /app

# Security: Run as non-root user
USER node

EXPOSE 8080

# Production-safe start using standard Node.js without tsx devDependency
CMD ["node", "server.js"]
