# GEMINI.md - Instructions for Google Gemini

> This file contains instructions specifically for Gemini models working on this codebase.
> Also read: `ARCHITECTURE.md` for full system documentation.

---

## Project Overview

This is **ATLAS** (Automated Technician & Locksmith Assistance System) - a WhatsApp-based sales automation platform for an automotive locksmith business.

**Key Point**: The system is MODULAR. There are 5 independent agents (Alex, Marcus, Diego, Sofia, Viper) that should NOT be mixed together.

---

## Before You Make Changes

1. **Read** `ARCHITECTURE.md` first - it explains the entire system
2. **Read** the specific agent folder you're modifying
3. **Never** import code from one agent into another
4. **Test** your changes with the owner commands

---

## File Structure Quick Reference

```
src/
├── core/           # SHARED - Be careful!
│   ├── config.js
│   ├── supabase.js
│   ├── openai.js
│   └── logger.js
│
├── agents/         # ISOLATED - One folder per agent
│   ├── alex/       # Sales
│   ├── marcus/     # Marketing
│   ├── diego/      # Operations
│   ├── sofia/      # Finance
│   ├── viper/      # Outreach
│   └── command-router.js
│
└── gateway/        # API entry point
```

---

## Working with Claude

This project is co-developed by **Claude** (Anthropic) and **Gemini** (Google).

- Claude created the ATLAS architecture
- Both AIs can contribute to the codebase
- Read `CLAUDE.md` to understand Claude's conventions
- This `GEMINI.md` is for your reference

**Collaboration Rules**:
1. Don't undo each other's work without reason
2. Follow the existing patterns in the code
3. Document your changes
4. Test before committing

---

## Key Technical Details

### Language & Framework
- Node.js with CommonJS (`require`, not `import`)
- Express.js for HTTP server
- Supabase for database (Postgres)
- OpenAI GPT-4o for AI responses

### Database
- Connection via `src/core/supabase.js`
- Use `getSupabase()` singleton pattern
- Tables: `leads`, `conversations`, `service_prices`, `events`, `scheduled_jobs`, `expenses`

### Logging
- Use structured logger: `require('./src/core/logger').child('ModuleName')`
- Don't use `console.log` in production code

---

## Common Tasks

### Add a new owner command
1. Edit `src/agents/command-router.js`
2. Add prefix to `COMMAND_PREFIXES`
3. Route to appropriate agent

### Modify an agent's behavior
1. Go to `src/agents/[agent-name]/`
2. Edit only files in that folder
3. Test with WhatsApp command

### Add a new agent
1. Create `src/agents/[new-name]/index.js`
2. Export `processOwnerCommand(command)`
3. Register in `command-router.js`
4. Update `ARCHITECTURE.md`

---

## DO NOT TOUCH

| Path | Reason |
|------|--------|
| `/data/libros_marcas/` | Knowledge base, years of data |
| `node_modules/` | Dependencies |
| `.env` | Secrets |
| `sales_agent.js` lines 1-50 | Critical imports |

---

## Testing

```bash
# Full system test
node src/test-atlas.js

# Test Diego specifically
node src/agents/diego/test-diego.js
```

---

## Deployment

- Push to `main` branch
- EasyPanel auto-deploys
- Verify with: `curl https://programming-car-agent-alex-agent.tojkrl.easypanel.host/`
- Should return: "Sales Agent Active (ATLAS)"

---

## Questions?

If something is unclear:
1. Read `ARCHITECTURE.md`
2. Read the agent's code
3. Ask the user (Jesus) for clarification

Don't guess - ask!
