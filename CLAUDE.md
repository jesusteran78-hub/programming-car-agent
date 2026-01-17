# CLAUDE.md

## Project Context
Programming Car OS - Specialized Enterprise Automation for Automotive Locksmithing.
Core Agent "Alex" handles sales via WhatsApp (Whapi.cloud), utilizing GPT-4o for logic and vision.

## Tech Stack
- Framework: Node.js (Express), Supabase (Postgres + Vector)
- Language: JavaScript (CommonJS)
- Integrations: OpenAI (GPT-4o), Whapi.cloud, NHTSA API

## Key Directories
- /dashboard — Next.js Admin Dashboard (EasyPanel)
- /libros_marcas — Raw text knowledge base for car keys
- / — Root contains the Express Backend (Alex)

## Commands
- `node sales_agent.js` — Start the Sales Agent

## Code Style
- Use `require` (CommonJS) for backend compatibility.
- Async/Await for all IO operations.
- JSDoc comments for complex functions.
- logs: `console.log` for info, `fs.appendFileSync('audit.log')` for critical interaction records.

---

## How I Want You to Work
### Before Coding
- **Plan**: Analyze the task and draft an approach.
- **Ask**: Clarifying questions if unsure.

### While Coding
- **No Placeholders**: Write complete, working code.
- **Simplicity**: Readable code over clever one-liners.
- **One Change at a Time**: Verify as you go.

### After Coding
- **Verify**: Code compiles and logic holds.
- **Lint/Format**: Ensure clean syntax.

## Verification Loop
1. Code compiles (node check).
2. Tests pass (manual/scripted).
3. No breaking changes to existing environment variables.

