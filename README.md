# Meeting assistant

Full-stack Next.js app for an evidence-linked Google Meet AI assistant.

## Stack

- Next.js App Router (UI + API)
- shadcn/ui (Base Nova)
- PostgreSQL + Prisma
- Auth.js (Google OAuth)

## Setup

1. Copy `.env.example` to `.env.local` and set Google OAuth credentials plus `AUTH_SECRET`.
2. Start Postgres: `docker compose up -d`
3. `pnpm db:generate && pnpm db:push`
4. `pnpm dev`

Google redirect URI: `http://localhost:3000/api/auth/callback/google`

shadcn MCP is configured in `.cursor/mcp.json`. Enable the server in Cursor Settings if tools do not appear.
