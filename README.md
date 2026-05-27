# VibeModerator OS

> The AI-powered moderation operating system for Reddit communities.

**GitHub Copilot + Zapier + Cloudflare + Notion — for Reddit Moderation.**

---

## What is VibeModerator OS?

VibeModerator OS transforms Reddit community moderation from fragmented, reactive, and technical into:

- Conversational AI rule creation
- Visual drag-and-drop automation workflows
- Proactive toxicity and brigade detection
- Intelligent moderation infrastructure

Moderators describe rules in plain English, simulate outcomes, deploy instantly, and monitor in real-time — all from a single enterprise-grade dashboard.

---

## Architecture

```
vibemod-os/
├── apps/
│   ├── web/                    # React + TypeScript frontend (Vite)
│   │   └── src/
│   │       ├── components/     # Reusable UI components
│   │       │   ├── layout/     # AppShell, Sidebar, TopBar
│   │       │   ├── copilot/    # ModGPT copilot panel
│   │       │   └── ui/         # Command palette, shared UI
│   │       ├── pages/          # Route pages (all 13 modules)
│   │       ├── store/          # Zustand global state
│   │       ├── lib/            # API client (axios)
│   │       └── styles/         # Global CSS + Tailwind tokens
│   │
│   ├── backend/                # Hono + Node.js API server
│   │   └── src/
│   │       ├── routes/         # All API route handlers
│   │       ├── middleware/      # Auth, rate limiting, logging
│   │       ├── services/       # Business logic services
│   │       └── workers/        # Background job processors
│   │
│   └── devvit/                 # Reddit Devvit app
│       └── src/
│           └── index.ts        # Triggers, menu actions, custom posts
│
├── packages/
│   ├── shared/                 # Shared TypeScript types, utils, constants
│   ├── ai-engine/              # AI engines (rule parser, toxicity, copilot, brigade)
│   ├── db/                     # Prisma schema, migrations, seed data
│   └── queue/                  # BullMQ workers for background processing
│
└── infrastructure/
    ├── docker/                 # Docker Compose, Dockerfiles, nginx
    └── scripts/                # Setup and deployment scripts
```

---

## Product Modules

| Module | Description |
|--------|-------------|
| **AI Rule Engine** | Convert natural language into structured moderation logic with AI confidence scoring |
| **Workflow Builder** | Visual drag-and-drop automation (React Flow canvas) |
| **Rule Simulator** | Test rules against sample content with execution traces |
| **ModGPT Copilot** | AI moderation assistant — summarize queues, draft modmail, explain actions |
| **ModMind** | Predictive toxicity detection and conversation trajectory analysis |
| **BrigadeSentry** | Real-time raid/brigading detection with live traffic monitoring |
| **ShadowScope** | Ban evasion intelligence with writing fingerprint analysis |
| **Analytics** | Community DNA — engagement quality, health scores, AI insights |
| **Mod Queue** | AI-prioritized moderation queue with bulk actions |
| **Mod Hub** | Kanban-style team operations and task coordination |
| **Marketplace** | Community rule templates and workflow packs |
| **Settings** | Per-subreddit configuration and threshold tuning |

---

## Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **TailwindCSS** with dark-mode-first design tokens
- **Framer Motion** for animations
- **Zustand** for global state
- **TanStack Query** for server state
- **Recharts** for analytics
- **React Flow** for workflow builder canvas

### Backend
- **Hono** (fast, TypeScript-native HTTP framework)
- **Prisma ORM** + **PostgreSQL**
- **Redis** + **BullMQ** for job queues
- **Jose** for JWT authentication
- **Zod** for runtime validation

### AI Layer
- **OpenAI GPT-4o** for rule parsing, copilot, analysis
- **GPT-4o-mini** for toxicity detection (cost-optimized)
- Custom simulation engine for rule execution
- Brigade detection with multi-signal analysis

### Infrastructure
- **Docker Compose** for local development
- **Nginx** for frontend serving
- Monorepo with **Turborepo**

### Reddit Integration
- **Reddit Devvit SDK** for native app integration
- `PostSubmit`, `CommentSubmit`, `PostReport` triggers
- Moderator menu actions
- Custom post types
- Scheduled traffic monitoring jobs

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- OpenAI API key

### 1. Clone and setup

```bash
git clone <repo-url>
cd vibemod-os
chmod +x infrastructure/scripts/setup.sh
./infrastructure/scripts/setup.sh
```

### 2. Configure environment

```bash
# Edit .env and add your OpenAI API key
nano .env
# OPENAI_API_KEY=sk-...
```

### 3. Start databases

```bash
npm run docker:up
```

### 4. Run migrations and seed demo data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development servers

```bash
npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:8080
Health check: http://localhost:8080/health

### 6. Login with demo account

Use `demo_mod_alex` or `demo_mod_sarah` on the login page.

---

## API Reference

### Auth
```
POST /api/v1/auth/login        — Login with Reddit username
GET  /api/v1/auth/me           — Get current user
```

### Rules
```
GET    /api/v1/rules/:subredditId          — List rules
POST   /api/v1/rules/:subredditId/parse    — AI parse natural language rule
POST   /api/v1/rules/:subredditId          — Create rule
PATCH  /api/v1/rules/:subredditId/:id      — Update rule
DELETE /api/v1/rules/:subredditId/:id      — Archive rule
POST   /api/v1/rules/:subredditId/:id/optimize — AI optimize rule
```

### Simulation
```
POST /api/v1/simulate              — Run content simulation
POST /api/v1/simulate/edge-cases   — Generate AI edge cases
POST /api/v1/simulate/toxicity     — Analyze content toxicity
```

### Copilot
```
POST /api/v1/copilot/chat              — Chat with ModGPT
GET  /api/v1/copilot/sessions          — List sessions
POST /api/v1/copilot/summarize-queue   — Summarize mod queue
POST /api/v1/copilot/draft-modmail     — Draft modmail reply
POST /api/v1/copilot/generate-automod  — Generate AutoMod YAML
```

### Brigade
```
GET  /api/v1/brigade/:subredditId/events       — List raid events
GET  /api/v1/brigade/:subredditId/status       — Current raid status
POST /api/v1/brigade/:subredditId/resolve/:id  — Resolve event
```

### Full API
See `/api/v1/analytics`, `/api/v1/shadow`, `/api/v1/queue`, `/api/v1/hub`, `/api/v1/marketplace`, `/api/v1/workflows`

---

## Devvit Deployment

### Install Devvit CLI

```bash
npm install -g devvit
devvit login
```

### Configure app settings

```bash
cd apps/devvit
devvit settings set VIBEMOD_BACKEND_URL https://your-backend.example.com
devvit settings set VIBEMOD_API_SECRET your-api-secret
```

### Upload to Reddit

```bash
devvit upload
```

### Playtest

```bash
devvit playtest your-subreddit-name
```

---

## Security

- JWT-based authentication with 7-day expiration
- Per-route RBAC with subreddit membership validation
- Rate limiting: 200 req/min per IP
- All AI API keys stored server-side only
- Prisma parameterized queries (SQL injection prevention)
- Zod runtime validation on all API inputs
- Devvit routes authenticated with separate API secret
- Audit log table tracks all moderator actions

---

## Demo Data

The seed script creates:
- 3 demo subreddits (r/programming, r/CryptoCurrency, r/gaming)
- 2 moderator accounts (demo_mod_alex, demo_mod_sarah)
- 3 active moderation rules with realistic stats
- 5 queued moderation items (mix of spam, toxicity, legitimate)
- 1 active raid event on r/CryptoCurrency
- 1 suspicious account under investigation
- 3 marketplace templates (verified)
- Full analytics report with AI insights
- 3 moderation tasks in the hub

---

## License

MIT — built for the Reddit Devvit Hackathon
