# Grant Tracker

**Centralised research funding organiser for SYNTHETICA Lab.**

Track research projects, find and manage grant opportunities, build applications with submission checklists, and maintain reusable project narratives (state of the art, bibliography, partners, budget, deliverables).

## Tech Stack

- **Frontend & API:** Next.js 16 (App Router, Turbopack)
- **Database:** SQLite via Prisma 7 + better-sqlite3 adapter
- **Editor:** @uiw/react-md-editor for rich text fields
- **Icons:** lucide-react
- **Port:** 3009

## How to Run

```bash
cd applications/grant-tracker
npm install
npx prisma db push
npx tsx prisma/seed.ts     # seed initial data (first time only)
npm run dev -- -p 3009
```

Open [http://localhost:3009](http://localhost:3009)

## Architecture

3-panel layout with 10 project tabs, ~20 REST API routes, 11 Prisma models, full version history, and markdown editor for rich text fields.
