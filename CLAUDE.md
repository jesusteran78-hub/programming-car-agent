# CLAUDE.md

## Project Context

Programming Car OS - Enterprise Automation Platform for Automotive Locksmithing.
Core Agent "Alex" handles sales via WhatsApp (Whapi.cloud), utilizing GPT-4o for logic and vision. Includes video generation (Sora 2/KIE), social media distribution (Blotato), and admin dashboard.

## Tech Stack

- **Backend:** Node.js (Express 5.x), CommonJS
- **Frontend:** React (Vite) for Dashboard
- **Database:** Supabase (Postgres + Vector embeddings)
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4o (chat + vision), Anthropic Claude (MCP bridge)
- **Integrations:** Whapi.cloud (WhatsApp), KIE API (Sora 2 video), Blotato (social distribution), NHTSA (VIN decoding)
- **Upcoming:** Stripe (payments)

## Key Directories

- `/` — Express Backend (sales_agent.js main entry)
- `/dashboard` — React Admin Dashboard (Vite + Tailwind)
- `/libros_marcas` — Knowledge base text files for car keys (DO NOT EDIT)

## Commands

- `node sales_agent.js` — Start the Sales Agent (PORT 3000)
- `cd dashboard && npm run dev` — Start Dashboard dev server
- `cd dashboard && npm run build` — Build Dashboard for production
- `npm run lint` — Run ESLint
- `npm run format` — Run Prettier

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
PORT=3000
```

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

### After Coding

- **Verify:** Code compiles (`node --check`)
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
- Log errors with `console.error` for debugging
- Use `fs.appendFileSync('audit.log')` for critical interaction records

## Do Not

- Edit files in `node_modules/`, `.env`, or `/libros_marcas/`
- Commit directly to main without PR
- Leave placeholder code or TODOs
- Make changes outside the scope of the task
- Use `console.log` for production code (use structured logging)
- Hardcode API keys or secrets in code files
- Assume — ask if unclear

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

## Agent "Alex" Guidelines

Alex is the WhatsApp sales agent. When modifying Alex's behavior:

- **Tone:** Professional and direct, sales-oriented
- **Language:** Spanish for customer interactions
- **Goal:** Convert inquiries to sales, provide accurate key/pricing info
- **Tools:** VIN decoder, key finder, price checker, video generator

---

## Verification Loop

After completing a task, verify:

1. Code compiles without errors (`node --check <file>`)
2. ESLint passes with no warnings
3. Prettier formatting applied
4. Changes match the original request
5. No breaking changes to existing `.env` variables

If any fail, fix before marking complete.

---

## Database Schema (Supabase)

Main tables:

- `leads` — Customer contacts (phone, name, vin, make, model, year)
- `conversations` — Chat history with embeddings (lead_id, role, content, embedding)
- `service_prices` — Learned pricing data (make, model, year, service_type, price)

---

## Quick Commands

When I type these shortcuts, do the following:

**"plan"** — Analyze the task, draft an approach, ask clarifying questions, don't write code yet

**"audit"** — Run a full codebase audit for security, code quality, and best practices

**"fix-security"** — Address critical security issues (credentials, validation, RLS)
