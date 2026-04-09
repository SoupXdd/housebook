# Testing Guide

This guide is meant to help you verify Housebook without missing the real integration points.

## Before You Start

1. Install backend deps:

```bash
npm install
```

2. Prepare database and demo data:

```bash
npm run setup:test-data
```

3. Start backend:

```bash
npm run dev:backend
```

## Test Accounts

- `alexey@housebook.local` / `password123`
- `maria@housebook.local` / `password123`
- `demo@housebook.local` / `changeme123`

Expected seed behavior:

- Alexey and Maria appear in community because they have books.
- Demo admin does not appear in community because the seed gives it no public books.

## Automated Checks

Run these before a larger review:

```bash
npm run build:backend
npm run test:e2e
```

Current expectation:

- backend e2e should pass fully
- one of the e2e checks now verifies that a newly registered user is created empty and does not inherit seed data

## Manual Smoke Test

### 1. Infrastructure

- Open `http://localhost:3001/health`
- Expect HTTP `200` and `"database":"connected"`
- Open `http://localhost:3001/api-docs`
- Confirm `auth`, `books`, and `users` endpoints are visible
- Confirm `loans` and `loan-requests` endpoints are visible

### 2. Auth and Session

- In Swagger or another API client, call `POST /auth/login` as `alexey@housebook.local`
- Confirm access and refresh tokens are returned
- Call `GET /auth/me` with the access token
- Confirm Alexey profile is returned
- Call `POST /auth/logout`
- Confirm `{ "success": true }`
- Try a wrong password
- Expect `401`

### 2.1 Fresh User Isolation

- Register a brand new user
- Open `GET /auth/me` in Swagger with that token
- Confirm `avatarUrl` is `null`
- Confirm `bio` is `null`
- Open `GET /books/library`
- Expect an empty array
- Open `GET /loans/outgoing` and `GET /loans/incoming`
- Expect empty arrays
- Open `GET /loan-requests/outgoing` and `GET /loan-requests/incoming`
- Expect empty arrays
- Open `GET /users/community`
- Confirm this new user is not listed until they save a book

### 3. Dashboard

- This is frontend territory.
- For backend handoff, confirm the underlying data exists:
  - `GET /books/library`
  - `GET /users/community`
  - `GET /loan-requests/incoming`
  - `GET /loans/outgoing`

### 4. My Library

- Call `GET /books/library`
- Confirm seeded books are listed
- Confirm additive fields exist when relevant:
  - `displayStatus`
  - `displayAuthor`
  - `isAvailable`
  - `isLent`
  - `activeLoan`

### 5. Book Detail

- Pick one book from `GET /books/library`
- Call `PATCH /books/library/:bookId`
- Change `readingStatus` from `reading` to `read` or back
- Confirm the new status is returned and persists in `GET /books/library`

### 6. Add Book

- Call `GET /books/lookup?isbn=9780140328721`
- Confirm book data is returned
- Call `POST /books/library` with the same ISBN
- Confirm the book is saved into the authenticated user's library

### 7. Community

- Call `GET /users/community`
- Confirm Alexey and Maria are shown
- Confirm Demo Admin is not shown
- Call `GET /users/:userId/library` for Maria
- Confirm her public books load from backend

### 8. Profile

- Call `PATCH /users/me`
- Change `bio` and `avatarUrl`
- Confirm the new values are returned
- Call `GET /auth/me`
- Confirm the profile changes persisted

### 9. Lending

- Log in as `alexey@housebook.local`
- Call `GET /loans/outgoing`
- Confirm there is at least one outgoing loan from seed
- Call `GET /loan-requests/incoming`
- Confirm there is at least one incoming borrow request from seed
- If needed, create a new manual loan with `POST /loans`
- Mark one active loan as returned with `PATCH /loans/:loanId/return`
- Confirm the returned state persists in `GET /loans/outgoing`
- Log in as `maria@housebook.local`
- Create a new borrow request with `POST /loan-requests`
- Confirm it appears in Maria's outgoing list and Alexey's incoming list
- Approve it as Alexey
- Confirm it becomes a real incoming loan for Maria

### 10. Account Isolation

- Log in as `maria@housebook.local`
- Confirm Maria sees her own library, not Alexey's
- Call `GET /users/community`
- Confirm Alexey's public library is still available there

## Things Easy To Miss

- CORS on `http://localhost:5173`
- token refresh after reload
- profile changes surviving refresh
- community list excluding users without books
- public book detail using backend data, not local mocks
- manual loan state surviving refresh
- borrow request state surviving refresh
- incoming and outgoing loans matching each other for in-app users
- incoming and outgoing request lists matching each other
- external lookup failures showing clear errors instead of silent failure

## Known Limitations

- upstream book providers can be unstable
- ISBN lookup is still the most reliable manual verification path
- reminders and overdue notifications are not implemented yet
- the current external React frontend still contains mock-driven UI in several major screens
