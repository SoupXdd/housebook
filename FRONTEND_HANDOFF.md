# Frontend Handoff

This document is the integration handoff for the frontend team.

## Summary

Backend is ready for frontend integration for these core flows:

- auth and session restore
- current user profile
- personal library
- book lookup and save
- public community users
- public user libraries
- manual loans
- borrow requests
- return flow

Verified on `2026-04-09`:

- backend e2e suite passes locally
- registration creates a truly empty new user
- fresh users do not receive seeded books, loans, requests, or default avatar data
- community excludes users who do not have saved books

Current product limitations still not implemented server-side:

- loan history as a separate user-facing flow
- reminders and notifications
- custom book photos/uploads
- multiple editable store links per book
- profile preferences such as `notifications` and `privacy`
- password-change and account-delete API
- full saved-book editing and deletion API

## Base URLs

- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api-docs`

## Seed Data and Isolation Guarantees

Seeded demo users:

- `alexey@housebook.local` / `password123`
- `maria@housebook.local` / `password123`
- `demo@housebook.local` / `changeme123`

Seed behavior that frontend can rely on:

- Alexey has seeded books and appears in community
- Maria has seeded books and appears in community
- Demo Admin has no public books and should not appear in community
- a newly registered user starts with:
  - `avatarUrl: null`
  - `bio: null`
  - empty personal library
  - no outgoing loans
  - no incoming loans
  - no outgoing loan requests
  - no incoming loan requests
  - no community card until they add at least one book

Important:

- seed data is tied to specific demo accounts only
- normal registration does not attach seeded books or loans to a new account

## Auth

### `POST /auth/register`

Request:

```json
{
  "name": "Maria Ivanova",
  "email": "maria@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": 12,
    "email": "maria@example.com",
    "name": "Maria Ivanova",
    "avatarUrl": null,
    "bio": null,
    "role": "USER",
    "createdAt": "2026-04-01T12:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z"
  }
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "alexey@housebook.local",
  "password": "password123"
}
```

Response shape is the same as `POST /auth/register`.

### `POST /auth/refresh`

Headers:

```http
Authorization: Bearer <refresh-token>
```

Response shape is the same as login/register.

### `GET /auth/me`

Headers:

```http
Authorization: Bearer <access-token>
```

Response:

```json
{
  "id": 1,
  "email": "alexey@housebook.local",
  "name": "Alexey",
  "avatarUrl": null,
  "bio": "Reader profile",
  "role": "USER",
  "createdAt": "2026-03-18T18:00:00.000Z",
  "updatedAt": "2026-04-01T09:30:00.000Z"
}
```

### `POST /auth/logout`

Headers:

```http
Authorization: Bearer <access-token>
```

Response:

```json
{
  "success": true
}
```

## Users and Community

### `GET /users/community`

Returns only users with at least one saved book.

Response:

```json
[
  {
    "id": 1,
    "name": "Alexey",
    "avatarUrl": null,
    "bio": "Reader profile",
    "booksCount": 4
  }
]
```

### `GET /users/:userId/library`

Response:

```json
[
  {
    "bookId": 101,
    "title": "Integration Testing Handbook",
    "authors": ["Test Runner"],
    "coverUrl": null,
    "description": "A synthetic book created by the e2e suite.",
    "isbn": "e2e-123",
    "year": 2026,
    "language": "English",
    "sourceName": "OpenLibrary",
    "sourceUrl": "https://openlibrary.org/isbn/e2e-123",
    "readingStatus": "reading",
    "addedAt": "2026-04-01T10:00:00.000Z",
    "activeLoan": null,
    "isLent": false,
    "isAvailable": true,
    "hasSourceLink": true,
    "displayAuthor": "Test Runner",
    "displayStatus": "Читаю"
  }
]
```

### `PATCH /users/me`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "name": "Updated Reader",
  "email": "updated@example.com",
  "bio": "Updated from frontend",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

Response:

```json
{
  "id": 1,
  "email": "updated@example.com",
  "name": "Updated Reader",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "Updated from frontend",
  "role": "USER",
  "createdAt": "2026-03-18T18:00:00.000Z",
  "updatedAt": "2026-04-01T10:15:00.000Z"
}
```

## Books

### `GET /books/lookup?isbn=...`

or

### `GET /books/lookup?url=...`

Response:

```json
{
  "title": "Dune",
  "authors": ["Frank Herbert"],
  "coverUrl": "https://...",
  "description": "Science fiction novel",
  "isbn": "9780441172719",
  "pagesCount": 688,
  "year": 1965,
  "language": "English",
  "sourceUrl": "https://openlibrary.org/...",
  "sourceName": "OpenLibrary"
}
```

### `POST /books/library`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "isbn": "9780441172719"
}
```

or

```json
{
  "url": "https://openlibrary.org/..."
}
```

Response:

```json
{
  "bookId": 101,
  "title": "Dune",
  "authors": ["Frank Herbert"],
  "coverUrl": "https://...",
  "description": "Science fiction novel",
  "isbn": "9780441172719",
  "year": 1965,
  "language": "English",
  "sourceName": "OpenLibrary",
  "sourceUrl": "https://openlibrary.org/...",
  "readingStatus": "unread",
  "addedAt": "2026-04-01T11:00:00.000Z",
  "isLent": false,
  "isAvailable": true,
  "hasSourceLink": true,
  "displayAuthor": "Frank Herbert",
  "displayStatus": "Не прочитана",
  "wasAlreadyInLibrary": false
}
```

### `GET /books/library`

Headers:

```http
Authorization: Bearer <access-token>
```

Response:

```json
[
  {
    "bookId": 101,
    "title": "Integration Testing Handbook",
    "authors": ["Test Runner"],
    "coverUrl": null,
    "description": "A synthetic book created by the e2e suite.",
    "isbn": "e2e-123",
    "year": 2026,
    "language": "English",
    "sourceName": "OpenLibrary",
    "sourceUrl": "https://openlibrary.org/isbn/e2e-123",
    "readingStatus": "reading",
    "addedAt": "2026-04-01T10:00:00.000Z",
    "activeLoan": {
      "id": 55,
      "ownerUserId": 1,
      "borrowerUserId": 2,
      "borrowerName": "Maria",
      "borrowerUserName": "Maria",
      "borrowerAvatarUrl": null,
      "lentAt": "2026-04-01T10:00:00.000Z",
      "dueAt": "2026-04-03T12:00:00.000Z",
      "returnedAt": null,
      "status": "active",
      "isOverdue": false,
      "daysLeft": 2,
      "dueState": "upcoming"
    },
    "isLent": true,
    "isAvailable": false,
    "hasSourceLink": true,
    "displayAuthor": "Test Runner",
    "displayStatus": "Читаю"
  }
]
```

### `PATCH /books/library/:bookId`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "readingStatus": "read"
}
```

Response shape is the same as a library book item.

### `GET /books/search?title=...`

Response:

```json
[
  {
    "title": "Dune",
    "authors": ["Frank Herbert"],
    "coverUrl": "https://...",
    "description": "Science fiction novel",
    "isbn": "9780441172719",
    "pagesCount": 688,
    "year": 1965,
    "language": "English",
    "sourceUrl": "https://openlibrary.org/...",
    "sourceName": "OpenLibrary"
  }
]
```

## Loans

### `POST /loans`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "bookId": 101,
  "borrowerUserId": 2,
  "dueAt": "2026-04-20T12:00:00.000Z"
}
```

or manual borrower:

```json
{
  "bookId": 101,
  "borrowerName": "Offline Friend",
  "dueAt": "2026-04-20T12:00:00.000Z"
}
```

Response:

```json
{
  "id": 55,
  "status": "active",
  "lentAt": "2026-04-01T10:00:00.000Z",
  "dueAt": "2026-04-20T12:00:00.000Z",
  "returnedAt": null,
  "isOverdue": false,
  "daysLeft": 19,
  "dueState": "upcoming",
  "owner": {
    "userId": 1,
    "name": "Alexey"
  },
  "borrower": {
    "userId": 2,
    "name": "Maria"
  },
  "book": {
    "bookId": 101,
    "title": "Dune",
    "authors": ["Frank Herbert"],
    "coverUrl": "https://...",
    "isbn": "9780441172719"
  }
}
```

### `GET /loans/outgoing`

### `GET /loans/incoming`

Both return arrays of the same `LoanResult` shape.

Important:

- sorting is server-driven
- active loans are first
- overdue and nearest due loans are prioritized
- returned loans go after active ones

### `PATCH /loans/:loanId/return`

Headers:

```http
Authorization: Bearer <access-token>
```

Response is the same `LoanResult` with:

```json
{
  "status": "returned",
  "returnedAt": "2026-04-01T12:00:00.000Z",
  "dueState": "returned"
}
```

## Loan Requests

### `POST /loan-requests`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "ownerUserId": 1,
  "bookId": 101,
  "message": "Можно взять эту книгу?"
}
```

Response:

```json
{
  "id": 77,
  "status": "pending",
  "message": "Можно взять эту книгу?",
  "createdAt": "2026-04-01T11:30:00.000Z",
  "updatedAt": "2026-04-01T11:30:00.000Z",
  "canApprove": false,
  "canReject": false,
  "resolutionLabel": "Ожидает решения",
  "owner": {
    "userId": 1,
    "name": "Alexey"
  },
  "requester": {
    "userId": 2,
    "name": "Maria"
  },
  "book": {
    "bookId": 101,
    "title": "Dune",
    "authors": ["Frank Herbert"]
  }
}
```

### `GET /loan-requests/incoming`

For owners. Returns:

- `canApprove: true` for pending requests
- `canReject: true` for pending requests

### `GET /loan-requests/outgoing`

For requesters. Returns the same request shape, but `canApprove` and `canReject` are false.

### `PATCH /loan-requests/:requestId/approve`

Headers:

```http
Authorization: Bearer <access-token>
```

Request:

```json
{
  "dueAt": "2026-05-01T12:00:00.000Z"
}
```

Response:

```json
{
  "id": 77,
  "status": "approved",
  "createdAt": "2026-04-01T11:30:00.000Z",
  "updatedAt": "2026-04-01T11:35:00.000Z",
  "canApprove": false,
  "canReject": false,
  "resolutionLabel": "Подтвержден",
  "approvedLoanId": 55,
  "owner": {
    "userId": 1,
    "name": "Alexey"
  },
  "requester": {
    "userId": 2,
    "name": "Maria"
  },
  "book": {
    "bookId": 101,
    "title": "Dune",
    "authors": ["Frank Herbert"]
  }
}
```

Important:

- repeated approve is idempotent
- repeated approve returns the current request state
- `approvedLoanId` is returned for approved requests

### `PATCH /loan-requests/:requestId/reject`

Headers:

```http
Authorization: Bearer <access-token>
```

Response:

```json
{
  "id": 77,
  "status": "rejected",
  "canApprove": false,
  "canReject": false,
  "resolutionLabel": "Отклонен"
}
```

## New Additive Fields

These fields were added without breaking existing response shapes.

### `LibraryBookResult`

- `isLent?: boolean`
- `isAvailable?: boolean`
- `hasSourceLink?: boolean`
- `displayAuthor?: string`
- `displayStatus?: string`
- `wasAlreadyInLibrary?: boolean`

### `activeLoan` inside library books

- `isOverdue?: boolean`
- `daysLeft?: number`
- `daysOverdue?: number`
- `dueState?: 'none' | 'upcoming' | 'due_today' | 'overdue' | 'returned'`

### `LoanResult`

- `isOverdue?: boolean`
- `daysLeft?: number`
- `daysOverdue?: number`
- `dueState?: 'none' | 'upcoming' | 'due_today' | 'overdue' | 'returned'`

### `LoanRequestResult`

- `canApprove?: boolean`
- `canReject?: boolean`
- `resolutionLabel?: string`
- `approvedLoanId?: number`

## Scenarios Already Tested

These flows are covered by backend e2e tests:

- health endpoint
- community shows only users with books
- public library returns expected book payload
- profile update via `/users/me`
- private library returns additive book state fields
- manual loan creation
- outgoing and incoming loans
- active loan visibility in `/books/library`
- overdue, upcoming, and no-due loan sorting behavior
- loan return flow
- loan request creation
- incoming requests with approval flags
- approve request into a real loan
- repeated approve returns stable current state

## Product Gaps Still Not Implemented

- full loan history as a separate end-user feature
- reminders and overdue notifications
- custom uploaded book photos
- multiple manually editable store links per saved book

## Current Frontend Mismatch Notes

The current React frontend repository is still mock-driven in several places. The backend is not the source of these inconsistencies:

- auth state and fake default avatar currently come from frontend mocks, not from API
- dashboard counters and recent books currently come from mock arrays
- community cards and public books currently come from mock arrays
- lending tabs and borrow requests currently come from mock arrays
- add/edit book flow currently assumes richer manual editing than the backend exposes today
- profile settings UI includes `notifications`, `privacy`, password change, and account deletion flows that do not have matching backend endpoints yet

What frontend can safely integrate right now:

- auth and session bootstrapping
- current user profile from `/auth/me`
- profile editing for `name`, `email`, `bio`, `avatarUrl`
- private library from `/books/library`
- reading status changes via `PATCH /books/library/:bookId`
- community list from `/users/community`
- public user library from `/users/:userId/library`
- loan creation, listing, approval, rejection, and return flows

What frontend should not expect yet:

- server-backed notification preferences
- server-backed privacy preferences
- change-password endpoint
- delete-account endpoint
- full manual edit/delete for saved books
- custom uploaded cover files

## Backend Readiness Snapshot

The following backend expectations have been explicitly verified:

- `POST /auth/register` creates an isolated user with no implicit data
- seeded demo data does not leak into newly registered accounts
- core frontend integration endpoints exist and are covered by backend tests:
  - `auth`
  - `books`
  - `users/community`
  - `users/:userId/library`
  - `users/me`
  - `loans`
  - `loan-requests`

## Integration Notes

- Current external frontend repo is still largely mock-data driven.
- Backend is ready for replacing mock auth, library, community, lending, and request flows.
- Frontend should treat these backend responses as the source of truth and keep new fields optional.
