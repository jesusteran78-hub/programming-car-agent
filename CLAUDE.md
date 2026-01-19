# CLAUDE.md

## Project Context

Programming Car OS - Enterprise Automation Platform for Automotive Locksmithing.
**ATLAS (Automated Technician & Locksmith Assistance System)** - A modular multi-agent architecture where each agent is isolated and communicates via database events.

## Tech Stack

- **Backend:** Node.js (Express 5.x), CommonJS
- **Frontend:** React (Vite) for Dashboard
- **Database:** Supabase (Postgres + Vector embeddings)
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4o (chat + vision), Anthropic Claude (MCP bridge)
- **Integrations:** Whapi.cloud (WhatsApp), KIE API (Sora 2 video), Blotato (social distribution), NHTSA (VIN decoding)
- **Upcoming:** Stripe (payments)

---

## ATLAS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GATEWAY                                  │
│              (Único punto de entrada)                           │
│  /webhook/whatsapp  →  Publica eventos a la DB                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT BUS (Supabase)                          │
│              Tabla: events                                       │
│  • message.received    • video.requested    • job.scheduled     │
│  • price.requested     • video.completed    • payment.received  │
└─────────────────────────────────────────────────────────────────┘
                              │
     ┌────────────┬───────────┼───────────┬────────────┐
     ▼            ▼           ▼           ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  ALEX   │ │ MARCUS  │ │  DIEGO  │ │  SOFIA  │ │  VIPER  │
│  Sales  │ │   Mkt   │ │   Ops   │ │ Finance │ │Outreach │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Agents

| Agent | Role | Key Functions |
|-------|------|---------------|
| **Alex** | Sales | WhatsApp conversations, VIN lookup, pricing, quotes |
| **Marcus** | Marketing | Video generation (Sora 2), social media publishing |
| **Diego** | Operations | Job scheduling, FCC lookups, agenda management |
| **Sofia** | Finance | Expense tracking, invoices, financial reports |
| **Viper** | Outreach | Campaign management, lead generation |

---

## Key Directories

```
programming-car-os/
├── src/
│   ├── core/                    # Shared infrastructure
│   │   ├── config.js            # Environment validation
│   │   ├── supabase.js          # Singleton Supabase client
│   │   ├── openai.js            # Singleton OpenAI client
│   │   ├── logger.js            # Structured logging
│   │   └── event-bus.js         # Event system
│   │
│   ├── gateway/                 # API entry point
│   │   ├── index.js             # Express server
│   │   └── routes/              # Webhook handlers
│   │
│   ├── agents/                  # ISOLATED Agents
│   │   ├── alex/                # Sales agent
│   │   ├── marcus/              # Marketing agent
│   │   ├── diego/               # Operations agent
│   │   ├── sofia/               # Finance agent
│   │   ├── viper/               # Outreach agent
│   │   └── command-router.js    # Owner command dispatcher
│   │
│   └── services/                # Shared services
│       └── whatsapp.js          # WhatsApp messaging
│
├── dashboard/                   # React Admin Dashboard
├── data/libros_marcas/          # Key knowledge base (DO NOT EDIT)
└── sales_agent.js               # Legacy entry point (bridges to Gateway)
```

---

## Commands

### Development

- `node sales_agent.js` — Start the Sales Agent (PORT 3000)
- `node src/test-atlas.js` — Run ATLAS integration tests
- `cd dashboard && npm run dev` — Start Dashboard dev server
- `cd dashboard && npm run build` — Build Dashboard for production
- `npm run lint` — Run ESLint
- `npm run format` — Run Prettier

### Owner WhatsApp Commands

```
help                    - Show all commands

Alex (Sales):
  ventas status         - Sales status

Marcus (Marketing):
  mkt video [idea]      - Generate viral video
  mkt status            - Video generation status

Diego (Operations):
  ops status            - Operations status
  ops today             - Today's jobs
  ops pending           - Pending jobs
  fcc [year] [make] [model] - FCC ID lookup

Sofia (Finance):
  fin status            - Monthly expenses
  fin today             - Today's expenses
  fin add [amt] [cat] [desc] - Record expense
  fin categorias        - Expense categories

Viper (Outreach):
  outreach status       - Campaign stats
  outreach list         - All campaigns
  outreach active       - Running campaigns
```

---

## Environment Variables

Required in `.env`:

```
OPENAI_API_KEY=
WHAPI_TOKEN=
SUPABASE_URL=
SUPABASE_KEY=
KIE_API_KEY=
BLOTATO_API_KEY=
BLOTATO_ACCOUNT_ID=
BLOTATO_INSTAGRAM_ID=
BLOTATO_YOUTUBE_ID=
BLOTATO_TWITTER_ID=
BLOTATO_FACEBOOK_ID=
BLOTATO_FACEBOOK_PAGE_ID=
ANTHROPIC_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=3000
```

---

## Database Schema (Supabase)

### Core Tables

- `leads` — Customer contacts (phone, name, vin, make, model, year)
- `conversations` — Chat history with embeddings
- `service_prices` — Learned pricing data

### ATLAS Tables

- `events` — Event bus for agent communication
- `agents` — Agent registry and heartbeats
- `scheduled_jobs` — Diego's job scheduler
- `expenses` — Sofia's expense tracking
- `outreach_campaigns` — Viper's campaigns

---

## How I Want You to Work

### Before Coding

- **Plan:** Analyze the task and draft an approach
- **Ask:** Clarifying questions if requirements are unclear
- **Research:** Read relevant files before proposing changes

### While Coding

- **No Placeholders:** Write complete, working code
- **Simplicity:** Readable code over clever one-liners
- **One Change at a Time:** Verify as you go
- **Follow Patterns:** Match existing codebase conventions
- **Agent Isolation:** Changes to one agent should NOT affect others

### After Coding

- **Verify:** Code compiles (`node --check`)
- **Test:** Run `node src/test-atlas.js` for integration tests
- **Lint/Format:** Run ESLint + Prettier before finishing
- **Summarize:** What changed and why

## Code Style

- Use `require` (CommonJS) for backend compatibility
- Async/Await for all IO operations
- JSDoc comments for all public/exported functions
- English for all code, variables, comments, and logs
- Descriptive variable names (no single letters except loops)
- No commented-out code

## Error Handling

- Return objects with `{ success: boolean, data?, error? }` pattern
- Never swallow errors silently
- Use structured logging via `require('./core/logger')`
- Events should be marked failed on error with `markEventFailed()`

## Do Not

- Edit files in `node_modules/`, `.env`, or `/data/libros_marcas/`
- Commit directly to main without PR
- Leave placeholder code or TODOs
- Make changes outside the scope of the task
- Use `console.log` for production code (use structured logging)
- Hardcode API keys or secrets in code files
- Assume — ask if unclear
- Break agent isolation (agents communicate via events only)

---

## Git Workflow

- **Branch:** `main` is the principal branch for PRs
- **Commits:** Use Conventional Commits format
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `chore:` Maintenance tasks

---

## Agent Guidelines

### Alex (Sales)
- **Tone:** Professional and direct, sales-oriented
- **Language:** Spanish for customer interactions
- **Goal:** Convert inquiries to sales, provide accurate key/pricing info
- **Tools:** VIN decoder, key finder, price checker

### Marcus (Marketing)
- **Video Style:** POV/hands-only to avoid lip-sync issues
- **Platforms:** TikTok, Instagram, YouTube, Twitter, Facebook
- **CTA:** Always mention "Alex" and WhatsApp link

### Diego (Operations)
- **FCC Database:** Uses libro_maestro for lookups
- **Scheduling:** Manages job calendar
- **Language:** Spanish for status reports

### Sofia (Finance)
- **Categories:** parts, fuel, tools, marketing, office, software, labor, other
- **Reports:** Monthly summaries by category

### Viper (Outreach)
- **Campaign Types:** whatsapp, sms, email, social, followup
- **Status:** draft, scheduled, running, paused, completed, cancelled

---

## Verification Loop

After completing a task, verify:

1. Code compiles without errors (`node --check <file>`)
2. ATLAS tests pass (`node src/test-atlas.js`)
3. ESLint passes with no warnings
4. Prettier formatting applied
5. Changes match the original request
6. No breaking changes to existing `.env` variables

If any fail, fix before marking complete.

---

## Quick Commands

When I type these shortcuts, do the following:

**"plan"** — Analyze the task, draft an approach, ask clarifying questions, don't write code yet

**"audit"** — Run a full codebase audit for security, code quality, and best practices

**"fix-security"** — Address critical security issues (credentials, validation, RLS)

**"test"** — Run `node src/test-atlas.js` and fix any failures
