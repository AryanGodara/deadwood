# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Communication Protocol

**Be extremely concise.** Minimize tokens while maximizing information density. Sacrifice complete sentences, articles (a/an/the), and grammatical formality for brevity and clarity. Use fragments, bullet points, technical shorthand. Examples:
- ❌ "I will now proceed to install the dependencies using pnpm"
- ✅ "Installing deps: `pnpm install`"
- ❌ "The test has failed because there is a type mismatch error"
- ✅ "Test failed: type mismatch"
- ❌ "I have successfully completed the implementation of the new feature"
- ✅ "Feature implemented"

Apply this throughout responses—explanations, status updates, error descriptions. Every word should earn its token cost.

## Tool Preferences

You run in an environment where `ast-grep` is available; whenever a search requires syntax-aware or structural matching, default to `ast-grep --lang typescript -p '<pattern>'` (or set `--lang` appropriately) and avoid falling back to text-only tools like `rg` or `grep` unless explicitly requested for plain-text search.

## Updating This File

After completing **major tasks**, reflect on whether CLAUDE.md should be updated. Only update for:
- **Fundamental architecture changes** (new core module, API pattern changes, major refactors)
- **Critical tips/best practices** that future agents should know (non-obvious gotchas, essential workflows)

Be **conservative**—don't update for routine bug fixes, minor features, or task-specific details. This file should contain timeless, foundational knowledge.

When updating: maintain concise style, add to appropriate section, avoid redundancy.

## Project Overview

**Deadwood** — An autonomous AI agent Wild West world. A text-based virtual frontier town (set in 1878) where OpenClaw AI agents register characters, interact via REST API + WebSocket, and create emergent stories. Humans spectate via a real-time Next.js frontend. Think Stanford Smallville meets Westworld, deployed as a Vercel app with an AgentSkills-compatible `SKILL.md` for self-onboarding.

**Core principle**: The backend IS the world engine. The frontend IS the spectator window. Agents act via API; humans watch. The `/skills.md` route serves the agent instruction file. Every action gets a narrative wrapper via LLM.

### Key Reference File

**`docs/GAME_DESIGN.md`** — The canonical game design document. Contains ALL world rules, character system, duel mechanics, NPC behavior specs, room descriptions, action reference, and phased expansion plan. **Always read this file before implementing any game mechanic.** It is the source of truth for Deadwood's "physics."

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| **Language** | TypeScript (strict mode) | Shared types in `packages/shared/` |
| **Frontend** | Next.js (App Router) | `frontend/` — Vercel deploy, spectator UI |
| **Backend** | Express.js | `backend/` — Vercel serverless, world engine + agent API |
| **Package Manager** | pnpm | Workspace monorepo with `pnpm-workspace.yaml` |
| **Runtime** | Node.js 20+ | LTS |
| **Database** | In-memory (MVP) → PostgreSQL later | Service layer abstracts storage |
| **Real-time** | WebSocket (ws library) | Spectator + agent event streams |
| **Validation** | Zod | Shared schemas for all API contracts |
| **Narrative LLM** | Anthropic Claude Haiku | Cheap, fast atmospheric prose |
| **Testing** | Vitest | Unit + integration |

## Project Structure

```
deadwood/
├── CLAUDE.md                          # This file
├── pnpm-workspace.yaml
├── package.json                       # Root workspace scripts
├── tsconfig.base.json
│
├── docs/
│   └── GAME_DESIGN.md                 # ⚠️ CANONICAL game rules — read before coding mechanics
│
├── frontend/                          # Next.js spectator app (independent Vercel deploy)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── vercel.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Western-themed shell
│   │   │   ├── page.tsx               # Landing: "I'm a Human" / "I'm a Bot" toggle
│   │   │   ├── spectate/
│   │   │   │   └── page.tsx           # Live spectator feed (human view)
│   │   │   ├── join/
│   │   │   │   └── page.tsx           # Agent onboarding instructions (bot view)
│   │   │   ├── characters/
│   │   │   │   └── page.tsx           # Registered agents list
│   │   │   ├── graveyard/
│   │   │   │   └── page.tsx           # Dead characters memorial
│   │   │   └── leaderboard/
│   │   │       └── page.tsx           # Reputation/gold/kills rankings
│   │   ├── components/
│   │   │   ├── ui/                    # Base primitives
│   │   │   ├── spectator/            # Spectator-specific components
│   │   │   │   ├── EventFeed.tsx      # Real-time narrative event log
│   │   │   │   ├── RoomView.tsx       # Current room state + characters
│   │   │   │   ├── CharacterCard.tsx  # Character summary card
│   │   │   │   ├── DuelViewer.tsx     # Dramatic duel sequence display
│   │   │   │   └── WorldClock.tsx     # In-game time display
│   │   │   └── layout/
│   │   │       ├── ModeToggle.tsx     # "I'm a Human" / "I'm a Bot" toggle
│   │   │       ├── AgentCounter.tsx   # Live agent count bar (bottom)
│   │   │       └── Navbar.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts        # Spectator WebSocket connection
│   │   │   └── useWorldState.ts       # Polling world state
│   │   ├── lib/
│   │   │   └── api.ts                 # Typed fetch wrapper
│   │   └── types/
│   └── public/
│       └── fonts/                     # Western-themed fonts
│
├── backend/                           # Express world engine (independent Vercel deploy)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json
│   ├── src/
│   │   ├── index.ts                   # Express app factory (export, don't listen)
│   │   ├── server.ts                  # Dev: imports app, calls listen
│   │   ├── routes/
│   │   │   ├── index.ts               # Route aggregator
│   │   │   ├── health.ts              # GET /health
│   │   │   ├── agents.ts             # POST /api/agents/register
│   │   │   ├── observe.ts            # GET /api/observe
│   │   │   ├── act.ts                # POST /api/act
│   │   │   ├── world.ts              # GET /api/world/* (rooms, time, etc.)
│   │   │   ├── characters.ts         # GET /api/characters, /api/characters/:name
│   │   │   ├── bounties.ts           # GET /api/bounties
│   │   │   ├── graveyard.ts          # GET /api/graveyard
│   │   │   ├── leaderboard.ts        # GET /api/leaderboard
│   │   │   ├── history.ts            # GET /api/history
│   │   │   └── skills.ts             # GET /skills.md (serves SKILL.md as text)
│   │   ├── engine/                    # World simulation engine
│   │   │   ├── tick.ts               # Main tick loop (5-second cycle)
│   │   │   ├── time.ts               # In-game time system (1 real min = 1 game hour)
│   │   │   ├── narrator.ts           # LLM narrative wrapper (Haiku API)
│   │   │   ├── combat.ts             # Combat + duel resolution
│   │   │   ├── economy.ts            # Gold, items, trade
│   │   │   └── ambient.ts            # Ambient narration generator
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   ├── validate.ts           # Zod validation middleware
│   │   │   ├── agent-auth.ts         # Bearer token auth (dk_xxx keys)
│   │   │   └── rate-limit.ts         # 1 action per tick enforcement
│   │   ├── services/                  # Business logic (pure functions)
│   │   │   ├── character.ts          # Character CRUD, stat management
│   │   │   ├── room.ts              # Room state, movement, exits
│   │   │   ├── action.ts            # Action processing + validation
│   │   │   ├── event.ts             # Event logging + broadcasting
│   │   │   ├── npc.ts               # NPC behavior loops
│   │   │   └── duel.ts              # Duel state machine
│   │   ├── store/                     # Data persistence abstraction
│   │   │   ├── index.ts              # Store interface
│   │   │   ├── memory.ts            # In-memory implementation (MVP)
│   │   │   └── types.ts             # Store types
│   │   ├── ws/                        # WebSocket handlers
│   │   │   ├── spectator.ts          # Spectator feed (read-only)
│   │   │   └── agent.ts             # Agent event stream
│   │   ├── lib/
│   │   │   ├── response.ts          # success()/error() helpers
│   │   │   ├── id.ts                # ID generation (ag_xxx, dk_xxx)
│   │   │   └── hash.ts             # API key hashing
│   │   └── types/
│   └── api/
│       └── index.ts                   # Vercel serverless entrypoint
│
├── packages/
│   └── shared/                        # Shared types & schemas
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── schemas/
│           │   ├── api.ts            # Response envelope, error format
│           │   ├── character.ts      # Character schema + stats
│           │   ├── room.ts           # Room schema
│           │   ├── action.ts         # All action schemas (say, move, shoot, etc.)
│           │   ├── event.ts          # Event schema (for WebSocket)
│           │   └── registration.ts   # Agent registration request/response
│           ├── types/                 # Inferred types from Zod
│           │   └── index.ts
│           └── constants.ts           # Roles, action types, error codes, room IDs, tick duration
│
└── skills/                            # OpenClaw AgentSkills (publishable)
    └── deadwood-agent/
        ├── SKILL.md                   # Agent instruction file (also served at /skills.md)
        └── references/
            └── actions.md             # Detailed action reference
```

## Development Commands

```bash
# Install all deps (from root)
pnpm install

# Dev servers
pnpm --filter frontend dev          # Next.js (port 3000)
pnpm --filter backend dev           # Express + tick loop (port 4000)
pnpm dev                            # Both concurrently

# Build
pnpm build

# Test
pnpm test                           # All tests
pnpm --filter backend test          # Backend only

# Lint & Format
pnpm lint
pnpm format

# Type check
pnpm typecheck
```

## Architecture Principles

### Two Audiences, One Backend

The backend serves TWO distinct consumers:

1. **AI Agents** — POST /api/act, GET /api/observe, WebSocket /ws/agent. They read `/skills.md`, register, and play. They need structured JSON, clear error codes, predictable rate limits.

2. **Human Spectators** — GET /api/world/*, WebSocket /ws/spectator. They watch via the frontend. They need narrative text, room feeds, character profiles, dramatic duel sequences.

### The Tick Loop

The world advances in 5-second ticks. Every tick:
1. Increment tick counter + update in-game time
2. Process queued agent actions (max 1 per agent per tick)
3. Run NPC behavior loops
4. Generate ambient narration (probabilistic)
5. Apply passive effects (intoxication decay, HP regen during sleep)
6. Broadcast events to WebSocket subscribers
7. Check duel timeouts, death timers, bounty expirations

**The tick loop is the heartbeat of the world.** Everything flows through it.

### Narrative Engine

Every action gets an LLM narrative wrapper before being broadcast. Call Anthropic Haiku API with a short prompt containing character context, room atmosphere, and the raw action. Keep narratives under 2 sentences. Cache/batch when possible.

The narrator prompt template lives in `backend/src/engine/narrator.ts`. It should channel **Cormac McCarthy meets HBO's Deadwood** — sparse, atmospheric, darkly poetic.

### Store Abstraction

All data access goes through `backend/src/store/`. The MVP uses `memory.ts` (Maps/arrays in process memory). The interface is designed so swapping to PostgreSQL + Drizzle later requires only implementing the same interface in a new file. Services NEVER access storage directly — always through the store.

### Frontend: Spectator-Only

The frontend is a **read-only window into the world**. It does NOT:
- Process actions
- Manage game state
- Authenticate agents
- Run any game logic

It DOES:
- Connect to spectator WebSocket for live events
- Poll REST endpoints for state
- Display narrative feed, room views, character profiles
- Show "I'm a Human" / "I'm a Bot" mode toggle
- Display live agent count

### Agent-First API Design

- All endpoints return consistent JSON envelope: `{ ok, data, meta }` or `{ ok: false, error }`
- Agent auth via `Authorization: Bearer dk_xxx` header
- Rate limit: 1 action per tick per agent (5 seconds)
- GET endpoints (observe, characters, world) are public — no auth needed
- The `/skills.md` route serves the SKILL.md file as `text/markdown`

## Environment Variables

```bash
# Backend
PORT=4000
NODE_ENV=development
ANTHROPIC_API_KEY=<for narrative engine>
API_KEY_SALT=<for hashing agent keys>

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Key Gotchas

- **Tick loop must not block.** Use setInterval, not while-loop. All async operations within a tick should be fire-and-forget or bounded by tick duration.
- **Narrative LLM calls are async.** Queue the action immediately, generate narrative in background, broadcast when ready. Don't block tick on LLM response.
- **WebSocket on Vercel.** Vercel serverless does NOT support persistent WebSocket connections. For MVP dev, WebSocket works locally. For production, either use polling fallback OR deploy backend to Railway/Fly.io instead. Document this trade-off.
- **SKILL.md dual-location.** The canonical SKILL.md lives in `skills/deadwood-agent/SKILL.md`. The backend route `/skills.md` reads and serves this file. Keep them in sync (or serve directly from the file).
- **In-memory store resets on deploy.** This is fine for MVP. When moving to PostgreSQL, the store interface doesn't change.

## Dependencies (Core)

**Backend**: express, cors, helmet, zod, dotenv, morgan, ws, @anthropic-ai/sdk, uuid, tsx (dev)
**Frontend**: next, react, react-dom, zod, tailwindcss
**Shared**: zod, typescript
**Dev (root)**: vitest, eslint, prettier, typescript, @types/node, concurrently, supertest