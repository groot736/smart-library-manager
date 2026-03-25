# Database Schema Overview (PostgreSQL + Prisma)

## Core Models

- User: roles, credentials, branch, verification, audit link
- Book: metadata, ISBN, category, tags, copies, branch
- Transaction: issue, return, renewal records, due dates, fine amount
- Reservation: queue position, approval status, expiry
- Fine: penalty records and payment status
- Recommendation: AI recommendation snapshots by source and score
- ActivityLog: user action auditing
- AnalyticsSnapshot: time-series metric snapshots

## Relationship Summary

- User 1:n Transaction
- User 1:n Reservation
- User 1:n Fine
- User 1:n ActivityLog
- Book 1:n Transaction
- Book 1:n Reservation
- User 1:n Recommendation + Book 1:n Recommendation

## Enums

- Role: STUDENT, FACULTY, ADMIN
- TransactionType: ISSUE, RETURN, RENEWAL
- ReservationStatus: PENDING, APPROVED, REJECTED, FULFILLED, CANCELLED
