# CareerOS - Job Application Tracker

CareerOS is a full-stack portfolio project for tracking job applications, managing follow-ups, and generating tailored application material with Gemini. The first screen is the product dashboard, not a marketing page.

## Features

- Dashboard metrics for total applications, active pipeline, interviews, offers, upcoming follow-ups, and rejection rate.
- CRUD workflow for job applications with company, role, location, work mode, job URL, salary range, status, priority, deadline, follow-up date, notes, and job description.
- Status pipeline: Saved, Applied, Screening, Interview, Offer, Rejected.
- Company and contact relationships in Prisma.
- Filtering and search by status, company, role, priority, and date range.
- Detail panel with notes, contact data, job link, timeline/history, and saved AI tailoring outputs.
- Gemini-powered tailoring route that returns CV bullet suggestions, a short cover-letter draft, interview preparation notes, and a keyword match summary.
- Safe deterministic mock AI fallback when `GEMINI_API_KEY` is missing or the Gemini request fails.
- Zod validation for client form submission and API route inputs.
- TanStack Query for client-side fetching, cache invalidation, and mutations.
- Vitest coverage for validation schemas, dashboard metrics, and tailoring helpers.

## Tech Stack

- Next.js App Router, React, TypeScript
- Prisma ORM with PostgreSQL
- Zod
- TanStack Query
- Vitest
- Gemini API via `@google/generative-ai`
- Docker Compose for local PostgreSQL

## Getting Started

Prerequisites:

- Node.js 20+
- npm
- Docker Desktop or another running Docker daemon

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d
```

Apply the Prisma migration and seed realistic sample data:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `MOCK_USER_EMAIL` | No | Email for the mock authenticated user. Defaults to `alex.rivera@example.com`. |
| `GEMINI_API_KEY` | No | Gemini API key. If omitted, AI tailoring uses a deterministic mock fallback. |
| `GEMINI_MODEL` | No | Gemini model name. Defaults to `gemini-2.0-flash`. |

## Authentication Note

OAuth is intentionally abstracted for this portfolio build. API routes call `getCurrentUser()` in `src/lib/auth.ts`, which upserts a mock user based on `MOCK_USER_EMAIL`. This keeps the product flow easy to run locally while preserving a single server-side integration point for replacing the mock with Auth.js, Clerk, or another OAuth provider.

## Architecture

- `src/app/page.tsx` renders the actual dashboard as the first screen.
- `src/components/application-dashboard.tsx` contains the responsive dashboard, filters, CRUD modal, detail panel, and AI tailoring UI.
- `src/app/api/*` contains REST-style route handlers for applications, dashboard metrics, companies, and tailoring.
- `src/lib/validation.ts` centralizes Zod schemas shared by the client and APIs.
- `src/lib/db.ts` initializes Prisma 7 with the Postgres driver adapter.
- `src/lib/metrics.ts` contains pure dashboard metric logic.
- `src/lib/tailoring.ts` contains Gemini integration plus deterministic mock generation.
- `prisma/schema.prisma` defines users, companies, contacts, applications, timeline events, and tailoring results.
- `prisma/seed.ts` creates realistic sample data for the mock user.

## Scripts

```bash
npm run dev          # Start Next.js locally
npm run build        # Build for production
npm run start        # Start the production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript
npm run test         # Run Vitest
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
```

## Testing

Run the local quality checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Troubleshooting

If `docker compose up -d` fails with `Cannot connect to the Docker daemon`, start Docker Desktop and rerun the command.

The Compose file maps Postgres to host port `5433` to avoid conflicts with a local Postgres install on `5432`. If `5433` is already in use, change the host port in `docker-compose.yml` and update `DATABASE_URL` in `.env`.
