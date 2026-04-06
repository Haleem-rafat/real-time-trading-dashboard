# Real-Time Trading Dashboard

A fullstack real-time trading dashboard that streams live ticker prices over WebSocket and renders an interactive chart for selected financial instruments.

## Tech Stack

**Backend** — NestJS 11 · TypeScript · MongoDB (Mongoose 8.9+) · Socket.IO 4.8 · Redis · Passport JWT · Jest

**Frontend** — React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · shadcn/ui · Redux Toolkit · SWR · Recharts · Socket.IO client

**Infra** — Docker · docker-compose

## Architecture

```
┌─────────────────┐  HTTPS/REST   ┌──────────────────┐   Mongoose   ┌─────────────┐
│  React 19 SPA   │ ─────────────▶│   NestJS 11 API  │─────────────▶│   MongoDB   │
│  (Vite 6 + TW4) │ ◀──── WS ─────│  Socket.IO 4.8   │              └─────────────┘
└─────────────────┘  Socket.IO    │  + Simulator     │   ioredis    ┌─────────────┐
                                  │  + Auth (JWT)    │─────────────▶│    Redis    │
                                  └──────────────────┘              └─────────────┘
```

A single in-process price simulator generates random-walk price ticks every second for 6 tickers (AAPL, TSLA, BTC-USD, ETH-USD, GOOGL, AMZN), persists them to MongoDB in batches, and fans out via Socket.IO rooms (one room per ticker symbol). Historical price queries are cached in Redis.

## Project Structure

```
real-time-trading-dashboard/
├── backend/                NestJS API + WebSocket gateway + simulator
├── frontend/               React 19 SPA dashboard
├── docker-compose.yml      MongoDB + Redis + backend + frontend
├── .env.example            Environment variable contract
└── README.md
```

## Quick Start

### Prerequisites
- Docker + Docker Compose
- (Optional for local dev) Node.js 22+

### Run with Docker (one command)

```bash
docker compose up --build
```

That brings up **all four services** (mongo + redis + backend + frontend) on a single bridge network. The frontend container is an nginx image that serves the built SPA and proxies `/api/` and `/socket.io/` to the backend service — so the browser only ever talks to one origin (no CORS gymnastics).

Then open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api/v1
- **API docs (Swagger)**: http://localhost:8080/docs

First boot takes ~30s while Mongo/Redis become healthy and the ticker seeder backfills 24h of historical price points.

### Local development (no Docker)

```bash
# Start MongoDB + Redis only
docker compose up mongo redis -d

# Backend (terminal 1)
cd backend && npm install && npm run start:dev

# Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

Frontend will be at http://localhost:5173 (or 5174 if 5173 is busy).

## Features

- ✅ Live ticker prices streamed via WebSocket (1 tick/sec)
- ✅ Interactive chart with seeded historical data + appended live ticks
- ✅ Ticker switching with selection state
- ✅ Mock JWT authentication (register/login/me)
- ✅ Redis caching for historical price queries
- ✅ Responsive dashboard (sidebar on desktop, stacked on mobile)
- ✅ Dark trading-terminal aesthetic (neon green/red price flashes)
- ✅ Unit tests for backend logic
- ✅ Dockerized (multi-stage builds)

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Register new user |
| POST | `/api/v1/auth/login` | public | Login with email/password |
| GET | `/api/v1/auth/me` | bearer | Get current user |
| GET | `/api/v1/tickers` | public | List all tickers |
| GET | `/api/v1/tickers/:symbol` | public | Get single ticker + last price |
| GET | `/api/v1/tickers/:symbol/history` | public | Get historical prices (cached) |
| GET | `/api/v1/health` | public | Health check |

## Socket.IO Events

**Client → Server**
- `subscribe:ticker { symbol }` — join ticker room
- `unsubscribe:ticker { symbol }` — leave ticker room
- `subscribe:tickers { symbols }` — bulk join

**Server → Client**
- `connection:ready` — handshake ack
- `price:update { symbol, price, change, changePct, timestamp }` — live tick

## Testing

```bash
cd backend
npm test              # unit tests
npm run test:cov      # with coverage
```

## Deployment — Fly.io (backend) + Vercel (frontend)

The stack is split across two platforms because the backend has a long-lived
WebSocket gateway + a perpetual price simulator (incompatible with serverless),
while the frontend is a static SPA that fits Vercel perfectly.

```
Vercel (SPA)  ──HTTPS──▶  Fly.io (NestJS)  ──▶  MongoDB Atlas (M0)
              ──WSS────▶                    ──▶  Upstash Redis
```

### One-time setup

1. **MongoDB Atlas** — create a free M0 cluster, allow `0.0.0.0/0`, copy the SRV URI
2. **Upstash Redis** — create a free database, copy the `rediss://...` URL
3. **Fly.io** — `brew install flyctl && fly auth signup`
4. **Vercel** — sign up + connect your GitHub account

### Backend → Fly.io

The repo root contains `fly.toml` and a Fly-specific `Dockerfile` that uses
`backend/` paths (build context = repo root). The `.dockerignore` excludes
`frontend/`, `node_modules`, and env files so the build context stays small.

```bash
# 1. Edit fly.toml — change `app = "trading-backend"` to a unique name
#    and pick a region near your users (`primary_region`)

# 2. Create the Fly app (or let `fly launch` do it)
fly apps create <your-app-name>

# 3. Set runtime secrets (NOT in fly.toml — these are encrypted by Fly)
fly secrets set \
  MONGODB_URL='mongodb+srv://user:pass@cluster.xxx.mongodb.net/trading?retryWrites=true&w=majority' \
  REDIS_URL='rediss://default:xxx@xxx.upstash.io:6379' \
  JWT_SECRET="$(openssl rand -base64 48)" \
  FRONTEND_URL='http://localhost:5173'   # placeholder; update after Vercel deploy

# 4. Deploy
fly deploy

# 5. Verify
curl https://<your-app-name>.fly.dev/api/v1/health
curl https://<your-app-name>.fly.dev/api/v1/tickers
```

> **Tip**: if you connected the Fly GitHub deployer instead of the CLI, just
> push the repo — Fly will pick up `fly.toml` + `Dockerfile` automatically.
> You still need to set the secrets via the CLI or the Fly dashboard.

### Frontend → Vercel

The `frontend/vercel.json` already wires Vite + SPA fallback + immutable asset
caching, so all you need to do in the dashboard is point Vercel at the
`frontend/` subdirectory and set 2 env vars.

1. **New Project** → import the GitHub repo
2. **Root Directory**: `frontend`
3. **Framework Preset**: Vite (auto-detected)
4. **Environment Variables** (Production scope):
   - `VITE_API_URL` = `https://<your-app-name>.fly.dev/api/v1`
   - `VITE_SOCKET_URL` = `https://<your-app-name>.fly.dev`
5. **Deploy** → copy the `*.vercel.app` URL

### Wire CORS back to Fly

Update the `FRONTEND_URL` secret on Fly with the real Vercel URL so the
backend's CORS middleware allows the browser. The backend's `main.ts` reads
`process.env.FRONTEND_URL?.split(',')` so multiple origins are supported:

```bash
fly secrets set FRONTEND_URL='https://<your-project>.vercel.app,https://<your-project>-git-main.vercel.app'
# This triggers an automatic redeploy on Fly
```

Include both the production URL and the `*-git-main` preview pattern so
PR/branch previews also work.

### End-to-end smoke test

1. Open `https://<your-project>.vercel.app`
2. Register a user → land on the dashboard
3. See 6 tickers updating live every second
4. Click any ticker → chart loads + appends live ticks
5. `fly logs` should show `Client connected: ... (user=...)`

### Costs

Fly.io's hobby plan has a **$5/mo minimum** spend (as of late 2024). A single
`shared-cpu-1x@512MB` machine running 24/7 stays comfortably within that.
Atlas M0, Upstash free, and Vercel hobby are $0. Total: **~$5/mo**.

If you want truly $0, swap Fly for Render (free tier; cold-starts after 15 min
of inactivity) — see the deployment notes in the project history.


## Environment Variables

### Backend (`backend/.env`)

| Var | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Node environment |
| `PORT` | `8080` | HTTP port |
| `MONGODB_URL` | `mongodb://localhost:27017/trading` | Mongo connection string |
| `MONGODB_DB_NAME` | `trading` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | `change-me-…` | JWT signing secret |
| `JWT_EXPIRES` | `24h` | Access token TTL |
| `FRONTEND_URL` | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `ALLOW_ANON_WS` | `true` | Permit anonymous WebSocket connections |
| `TICK_INTERVAL_MS` | `1000` | Simulator tick interval |

### Frontend (`frontend/.env`)

| Var | Local default | Docker build arg |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | `/api/v1` (proxied by nginx) |
| `VITE_SOCKET_URL` | `http://localhost:8080` | `/` (proxied by nginx) |

## Trade-offs & Notes

- **Single-process simulator** instead of Redis pub/sub — simpler for the demo. Horizontal scaling would use `@socket.io/redis-adapter` + Redis pub/sub for multi-replica fan-out.
- **Batched DB inserts** every 10 ticks to avoid hammering MongoDB on every tick.
- **In-memory `lastPrices` map** is the source of truth for the latest price; DB writes are async and don't block fan-out.
- **SWR for cacheable REST data, Redux for live tick stream** — clean separation of cacheable vs streaming state.
- **Recharts `isAnimationActive={false}`** is critical for smooth real-time updates.
- **Chart capped at 300 points** to keep Recharts performant on long sessions.
- **JWT-only auth (no refresh tokens)** — meets the "mock auth" requirement.
- **Frontend served by nginx** with `/api/` and `/socket.io/` reverse-proxied to the backend service. The browser sees a single origin, so there is **no CORS preflight in the dockerised setup**.
- **Mean reversion** in the price simulator (`MEAN_REVERSION_STRENGTH = 0.005`) keeps prices loosely anchored to each ticker's `base_price` so the random walk doesn't drift to zero or infinity over long sessions.
