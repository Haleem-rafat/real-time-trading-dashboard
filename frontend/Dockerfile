# syntax=docker/dockerfile:1.6

# ─────────────────────────────────────────────────────────────
# Stage 1 — builder: install deps + produce production bundle
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time env vars baked into the bundle by Vite.
# Defaults are nginx-relative paths so the runtime container
# can proxy /api/ and /socket.io/ to the backend service.
ARG VITE_API_URL=/api/v1
ARG VITE_SOCKET_URL=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build


# ─────────────────────────────────────────────────────────────
# Stage 2 — runtime: tiny nginx image serving the built SPA
# ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Apply latest security patches and install wget for HEALTHCHECK
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget

# Replace the default site with our SPA-aware config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Drop in the built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
