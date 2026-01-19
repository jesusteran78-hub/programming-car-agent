# ARCHITECTURE.md - ATLAS System Documentation

> **FOR ALL AI MODELS**: This document explains how the ATLAS system works. Read this BEFORE making any changes to ensure you don't break the system.

---

## What is ATLAS?

**A**utomated **T**echnician & **L**ocksmith **A**ssistance **S**ystem

ATLAS is a modular multi-agent architecture for an automotive locksmith business. It handles:
- Customer sales via WhatsApp
- Video marketing generation
- Job scheduling
- Financial tracking
- Outreach campaigns

---

## Core Principle: Agent Isolation

```
CRITICAL RULE: Each agent is an ISLAND.
- Agents do NOT import code from other agents
- Agents communicate ONLY via the database (event bus)
- If Alex breaks, Marcus keeps working
```

---

## System Architecture

```
                    WhatsApp (Whapi.cloud)
                           │
                           ▼
                    ┌─────────────┐
                    │ sales_agent │  ← Main entry point
                    │    .js      │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │    USE_ATLAS=true?      │
              └────────────┬────────────┘
                    YES    │    NO
                    ▼      │    ▼
              ┌────────┐   │  ┌────────┐
              │ ATLAS  │   │  │ Legacy │
              │ System │   │  │ System │
              └────────┘   │  └────────┘
                           │
              ┌────────────┴────────────┐
              │     command-router.js    │
              │  Routes owner commands   │
              └────────────┬────────────┘
                           │
     ┌──────────┬──────────┼──────────┬──────────┐
     ▼          ▼          ▼          ▼          ▼
┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
│  ALEX   ││ MARCUS  ││  DIEGO  ││  SOFIA  ││  VIPER  │
│ Sales   ││Marketing││   Ops   ││ Finance ││Outreach │
│         ││         ││         ││         ││         │
│ src/    ││ src/    ││ src/    ││ src/    ││ src/    │
│ agents/ ││ agents/ ││ agents/ ││ agents/ ││ agents/ │
│ alex/   ││ marcus/ ││ diego/  ││ sofia/  ││ viper/  │
└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘
```

---

## The 5 Agents

### 1. Alex (Sales) - `src/agents/alex/`
**Purpose**: Handle WhatsApp conversations with customers
**Key Files**:
- `index.js` - Main entry, getAIResponse function
- `prompts.js` - GPT system prompts
- `tools.js` - GPT function calling tools
- `handlers.js` - Business logic

**Commands**: `ventas status`

### 2. Marcus (Marketing) - `src/agents/marcus/`
**Purpose**: Generate viral videos and publish to social media
**Key Files**:
- `index.js` - Main entry, processOwnerCommand
- `video-generator.js` - KIE/Sora 2 integration
- `social-publisher.js` - Blotato integration

**Commands**: `mkt video [idea]`, `mkt status`

### 3. Diego (Operations) - `src/agents/diego/`
**Purpose**: Job scheduling and FCC lookups
**Key Files**:
- `index.js` - Main entry, processOwnerCommand
- `scheduler.js` - Job calendar management
- `fcc-lookup.js` - FCC ID database queries

**Commands**: `ops status`, `ops today`, `ops pending`, `fcc [year] [make] [model]`

### 4. Sofia (Finance) - `src/agents/sofia/`
**Purpose**: Expense tracking and financial reports
**Key Files**:
- `index.js` - All finance logic

**Commands**: `fin status`, `fin today`, `fin add [amount] [category] [description]`

### 5. Viper (Outreach) - `src/agents/viper/`
**Purpose**: Campaign management for lead generation
**Key Files**:
- `index.js` - All outreach logic

**Commands**: `outreach status`, `outreach list`, `outreach active`

---

## Core Infrastructure - `src/core/`

These files are SHARED by all agents. Be CAREFUL when modifying:

| File | Purpose | Impact if Broken |
|------|---------|------------------|
| `config.js` | Validates .env variables | ALL agents fail to start |
| `supabase.js` | Database connection | ALL agents lose DB access |
| `openai.js` | GPT connection | Alex can't respond |
| `logger.js` | Structured logging | Debugging becomes impossible |
| `event-bus.js` | Agent communication | Agents can't coordinate |

---

## Database Tables (Supabase)

### Core Tables (DO NOT DELETE)
- `leads` - Customer information
- `conversations` - Chat history
- `service_prices` - Pricing database

### ATLAS Tables
- `events` - Event bus for agent communication
- `agents` - Agent registry
- `scheduled_jobs` - Diego's job scheduler
- `expenses` - Sofia's expense tracking
- `outreach_campaigns` - Viper's campaigns

---

## Feature Flag: USE_ATLAS

In `.env`:
```
USE_ATLAS=true   # Use new modular system
USE_ATLAS=false  # Use legacy monolithic system
```

This allows instant rollback if ATLAS has issues.

---

## How to Add a New Agent

1. Create folder: `src/agents/[agent-name]/`
2. Create `index.js` with:
   - `processOwnerCommand(command)` function
   - Export the function
3. Add to `command-router.js`:
   - Add prefix to `COMMAND_PREFIXES`
   - Add processor to `AGENT_PROCESSORS`
4. Update this documentation

Example:
```javascript
// src/agents/newagent/index.js
async function processOwnerCommand(command) {
  return {
    success: true,
    message: 'Response here'
  };
}

module.exports = { processOwnerCommand };
```

---

## How to Modify an Agent

1. **Read** the agent's files first
2. **Only modify** files in that agent's folder
3. **Never import** from other agent folders
4. **Test** with owner commands via WhatsApp
5. **Commit** with clear message

---

## DANGER ZONES - DO NOT EDIT

| Path | Reason |
|------|--------|
| `/data/libros_marcas/` | Car key knowledge base, took years to build |
| `node_modules/` | Dependencies, will break everything |
| `.env` | Secrets, never commit |
| Database RLS policies | Security, customers could see other customers' data |

---

## Common Patterns

### Return Object Pattern
All functions return:
```javascript
{
  success: true/false,
  data: {...},      // if success
  error: "message"  // if failed
}
```

### Logging Pattern
```javascript
const logger = require('../core/logger').child('AgentName');
logger.info('Message');
logger.error('Error:', error);
```

### Database Pattern
```javascript
const { getSupabase } = require('../core/supabase');
const supabase = getSupabase();
const { data, error } = await supabase.from('table').select('*');
```

---

## Deployment

- **Production**: EasyPanel at `programming-car-agent-alex-agent.tojkrl.easypanel.host`
- **Git**: Push to `main` branch triggers auto-deploy
- **Environment**: Set `USE_ATLAS=true` in EasyPanel environment variables

---

## Testing

```bash
# Test all ATLAS components
node src/test-atlas.js

# Test specific agent
node src/agents/diego/test-diego.js
```

---

## Quick Reference

### Owner Command Flow
```
1. Owner sends "ops status" via WhatsApp
2. Whapi sends webhook to EasyPanel
3. sales_agent.js receives message
4. Checks USE_ATLAS=true
5. command-router.js parses "ops" prefix
6. Routes to diego.processOwnerCommand("status")
7. Diego returns { success: true, message: "..." }
8. Response sent back via Whapi
```

### Customer Flow
```
1. Customer sends "Hola" via WhatsApp
2. alex.getAIResponse() handles it
3. GPT generates response
4. Saves to conversations table
5. Response sent back via Whapi
```

---

## Contact

- **Owner**: Jesus (WhatsApp: 17868164874)
- **Business**: Programming Car (automotive locksmith)
- **Location**: USA

---

## Version History

| Date | Change | By |
|------|--------|-----|
| 2026-01-19 | ATLAS v1.0 - Initial modular architecture | Claude + Jesus |

---

**Remember**: When in doubt, ASK before changing. It's better to ask than to break production.
