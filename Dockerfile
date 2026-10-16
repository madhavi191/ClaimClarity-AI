# Multi-stage Dockerfile for ClaimClarity AI on Google Cloud Run
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Firebase web configuration for the frontend build
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

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
RUN npm install --omit=dev

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
