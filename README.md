# Housebook

This repository contains the Housebook backend only.

## Stack

- `backend`: NestJS + Prisma + PostgreSQL API
- PostgreSQL for persistence

## Current Status

- Backend is ready for frontend integration on the core flows.
- Registration creates an actually empty new user.
- Seeded demo data is isolated and does not leak into newly registered accounts.
- Frontend integration notes are collected in [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md).
- Verification steps are collected in [TESTING.md](./TESTING.md).

## What Works Now

- registration, login, refresh, logout
- registration creates an empty new user without seeded books or seeded loans
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

1. Install dependencies:

```bash
npm install
```

2. Create local env file if needed:

```bash
cp backend/.env.example backend/.env
```

3. Start PostgreSQL, push schema, and seed demo data:

```bash
npm run setup:test-data
```

4. Start backend:

```bash
npm run dev:backend
```

Frontend note:

- this repository does not include the frontend app
- the backend can be tested independently via Swagger and e2e tests
- frontend teammates should use [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) as the API handoff

## Local URLs

- Backend API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api-docs`
- Health: `http://localhost:3001/health`

## Docker Deployment

You can run the backend stack through Docker:

- `postgres`
- `backend` (NestJS + Prisma API)

Quick start:

```bash
cp infra/.env.example infra/.env
./scripts/prod-up.sh
```

Requirements:

- Docker Engine
- Docker Compose plugin or `docker-compose`

Default production URLs:

- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`

Notes:

- update `infra/.env` before exposing the app publicly, especially `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`
- the production compose file binds PostgreSQL and the backend to `127.0.0.1`
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
npm run build:backend
npm run lint:backend
npm run test:e2e
```

## Smoke Test

Use the full checklist in [TESTING.md](./TESTING.md).
Frontend integration payloads and endpoint examples are documented in [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md).

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
- Notification preferences, privacy preferences, password change, and account deletion APIs are not implemented yet.

## License

UNLICENSED
