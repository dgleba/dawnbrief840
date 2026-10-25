# Multi-stage Dockerfile for Self-Hosted Daily News Briefing Application

# Stage 1: Build application assets and compiled server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install all dependencies required for building
RUN npm install

# Copy source code
COPY . .

# Build static Vite assets and bundle server.ts to dist/server.cjs
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json and install production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy production build outputs
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
