# Housebook

Housebook is a local home-library project with a production-style NestJS backend and a separate frontend client.

## Stack

- `apps/backend`: NestJS + Prisma + PostgreSQL API
- `frontend-bookinventoryapp`: Vite + React frontend

## Current Status

- Backend is the primary deliverable and is ready for frontend integration.
- The external frontend repository is still mock-data heavy and should not be treated as the source of truth for runtime behavior.
- Frontend integration notes are collected in [FRONTEND_HANDOFF.md](/home/soupp/Documents/housebook/FRONTEND_HANDOFF.md).

## What Works Now

- registration, login, refresh, logout
- persistent session restore after reload
- personal library from backend
- add a book by ISBN or supported URL
- change reading status for saved books
- real community users from backend
- public user libraries from backend
- profile editing (`name`, `email`, `bio`, `avatarUrl`) via backend
- manual lending tracking for outgoing and incoming books
- borrow requests with approve/reject flow
- additive UX fields for library books, loans, and loan requests
- server-driven loan urgency sorting
- idempotent repeated approval for loan requests

## Quick Start

1. Install backend dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
npm run setup:frontend
```

3. Create local env files if needed:

```bash
cp apps/backend/.env.example apps/backend/.env
cp frontend-bookinventoryapp/.env.example frontend-bookinventoryapp/.env
```

4. Start PostgreSQL, push schema, and seed demo data:

```bash
npm run setup:test-data
```

5. Start backend:

```bash
npm run dev:backend
```

6. Start frontend in another terminal:

```bash
npm run dev:frontend
```

Frontend note:

- the backend can be tested independently via Swagger and e2e tests
- the current frontend repo may still show mock behavior until it is reconnected to API endpoints

## Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api-docs`
- Health: `http://localhost:3001/health`

## Docker Deployment

You can run the full stack through Docker only:

- `postgres`
- `backend` (NestJS + Prisma)
- `frontend` (Vite build served by `nginx`)

Quick start:

```bash
cp infra/.env.example infra/.env
./scripts/prod-up.sh
```

Requirements:

- Docker Engine
- Docker Compose plugin or `docker-compose`

Default production URLs:

- Frontend: `http://localhost`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost/api-docs`

Notes:

- update `infra/.env` before exposing the app publicly, especially `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`
- the production compose file binds PostgreSQL and the backend to `127.0.0.1`, while the frontend container is exposed publicly on `FRONTEND_PORT`
- `./scripts/prod-up.sh` applies the Prisma schema and seeds demo data via Docker, so the host machine does not need a separate Node.js setup

## Demo Accounts

- `alexey@housebook.local` / `password123`
  Main smoke-test account. Has 4 books.
- `maria@housebook.local` / `password123`
  Second user for community/public-library checks. Has 2 books.
- `demo@housebook.local` / `changeme123`
  Admin-flavored local account. By default it has no public books, so it should not appear in community.

## Common Commands

```bash
npm run db:up
npm run db:down
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev:backend
npm run dev:frontend
npm run build:frontend
npm --workspace apps/backend run build
npm --workspace apps/backend run lint
npm --workspace apps/backend run test:e2e
```

## Smoke Test

Use the full checklist in [TESTING.md](/home/soupp/Documents/housebook/TESTING.md).
Product scope and refined requirements are documented in [REQUIREMENTS.md](/home/soupp/Documents/housebook/REQUIREMENTS.md).
The implementation gap-analysis and delivery sequence are documented in [ROADMAP.md](/home/soupp/Documents/housebook/ROADMAP.md).
Frontend integration payloads and endpoint examples are documented in [FRONTEND_HANDOFF.md](/home/soupp/Documents/housebook/FRONTEND_HANDOFF.md).

Short version:

1. Open Swagger at `http://localhost:3001/api-docs`.
2. Log in as `alexey@housebook.local`.
3. Call `GET /books/library` and verify additive fields such as `displayStatus`, `isAvailable`, and `activeLoan`.
4. Call `GET /users/community` and confirm only users with books are visible.
5. Call `GET /users/{userId}/library` for a public user.
6. Create a manual loan with `POST /loans`.
7. Check `GET /loans/outgoing` and `GET /loans/incoming`.
8. Return a loan with `PATCH /loans/{loanId}/return`.
9. Create a borrow request with `POST /loan-requests`.
10. Approve a request with `PATCH /loan-requests/{requestId}/approve`.
11. Repeat approve once and confirm the response remains stable.

## Current Product Boundaries

- Community only shows users who have at least one saved book.
- Loan requests and manual loans are implemented, but reminders and loan history are still future work.
- External provider lookups can still be flaky; ISBN is the most reliable smoke-test path.
- Custom uploaded book photos are not implemented.
- Multiple editable store links per saved book are not implemented.

## License

UNLICENSED
