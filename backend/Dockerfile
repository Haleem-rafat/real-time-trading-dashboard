# syntax=docker/dockerfile:1.6

# ─────────────────────────────────────────────────────────────
# Stage 1 — builder: install all deps + compile TypeScript
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# bcrypt has native bindings — needs python3 + g++ on Alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Strip dev deps so we can copy a slimmer node_modules into the runtime stage.
# Native bindings already compiled above are kept.
RUN npm prune --omit=dev


# ─────────────────────────────────────────────────────────────
# Stage 2 — runtime: minimal image with only what we need
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Apply latest security patches and install wget for HEALTHCHECK,
# then create a non-root user for the runtime process.
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache wget && \
    addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nestjs -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
