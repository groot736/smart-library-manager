# API Documentation

Base URL: http://localhost:4000/api

## Auth

- POST /auth/register
- POST /auth/verify-otp
- POST /auth/login
- GET /auth/me

## Books

- GET /books
- GET /books/home-feed
- GET /books/scan/:code
- GET /books/:id
- POST /books (ADMIN)
- PUT /books/:id (ADMIN)
- DELETE /books/:id (ADMIN)

## Transactions

- GET /transactions/my
- GET /transactions (ADMIN/FACULTY)
- POST /transactions/issue
- POST /transactions/return
- POST /transactions/renew/:id

## Reservations

- GET /reservations/my
- GET /reservations (ADMIN/FACULTY)
- POST /reservations
- POST /reservations/:id/approve (ADMIN/FACULTY)
- POST /reservations/:id/reject (ADMIN/FACULTY)

## Analytics

- GET /analytics/dashboard

## AI

- POST /ai/smart-search
- GET /ai/recommendations
- GET /ai/forecast
- POST /ai/chat
- POST /ai/chat-public
- POST /ai/study-mode
- GET /ai/availability-forecast/:bookId
- GET /ai/study-matches (AUTH)
- GET /ai/leaderboard
- GET /ai/badges/me (AUTH)

## Users

- GET /users (ADMIN)
- GET /users/:id/history (ADMIN/FACULTY)

## Sample Payloads

### Login

Request:

```json
{
  "email": "admin@unilib.ai",
  "password": "Password@123"
}
```

Response:

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@unilib.ai",
    "role": "ADMIN"
  }
}
```

### AI Study Mode

Request:

```json
{
  "bookId": "BOOK_ID",
  "prompt": "Create revision notes for semester exam"
}
```

Response:

```json
{
  "summary": "...",
  "keyNotes": ["..."],
  "mcqs": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "B"
    }
  ],
  "revisionChecklist": ["..."]
}
```
