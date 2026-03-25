# UniLib AI - University Library Management SaaS

Created by Subhadeep Mondal.

UniLib AI is a full-stack, AI-powered university library platform with production-style architecture, role-based access, advanced dashboards, semantic search, recommendation endpoints, and realtime analytics.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS v4, Framer Motion, Chart.js, Zustand
- Backend: Node.js, Express, TypeScript, Prisma ORM, JWT auth, Socket.IO
- Database: PostgreSQL
- AI Layer: semantic search, recommendations, forecasting, chatbot intent handling
- DevOps: Dockerfiles + docker-compose

## Roles

- STUDENT: search, issue/return, reserve, personal dashboard
- FACULTY: oversight operations + reservation approvals
- ADMIN: full control panel and analytics

## Project Structure

- apps/web - React frontend with premium UI/UX and PWA assets
- apps/api - REST API + auth + domain services + Prisma schema
- docs - API, schema, and architecture docs

## Quick Start

1. Install dependencies

```bash
npm install
```

Or run full local bootstrap in one command:

```bash
npm run setup:local
```

2. Start PostgreSQL using Docker (recommended)

```bash
docker compose up -d postgres
```

3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

4. Run Prisma migration and seed demo data

```bash
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api
npm run prisma:seed -w apps/api
```

5. Start backend and frontend

```bash
npm run dev
```

Alternative shortcuts:

```bash
npm run dev:local
```

```bash
npm run dev:docker
```

To stop docker mode:

```bash
npm run stop:docker
```

- API: http://localhost:4000
- Web: http://localhost:5173

## Demo Accounts

- admin@unilib.ai / Password@123
- faculty@unilib.ai / Password@123
- student@unilib.ai / Password@123

## Security Highlights

- JWT authentication and role-based authorization
- Input validation using Zod
- Helmet, CORS, and structured error handling
- Password hashing with bcrypt

## AI Features Included

- Natural-language smart search endpoint
- Personalized recommendation endpoint
- Forecast endpoint for demand and low-stock signals
- Chatbot endpoint for FAQs and search assistance
- AI Study Mode (summary + key notes + MCQs + revision checklist)
- Predictive book availability estimator
- Gamification leaderboard and badge scoring
- Study matchmaking for users reading similar books
- Auto-tag generation for book metadata

## Realtime + Advanced Features

- Socket.IO realtime analytics updates
- Reservation queue with approval flow
- Fine calculation and transaction lifecycle
- Notification simulation service (email/SMS style payload)
- Barcode/RFID simulation endpoint (`GET /api/books/scan/:code`)
- Voice search UX in Innovation Hub page
- Digital reader simulation with highlight notes
- PWA manifest and service worker support

## Premium UI Highlights

- Glassmorphism-based responsive layout with dark/light mode
- Netflix-style horizontal catalog strips (trending/recommended/new)
- AI Lab route (`/innovation`) for advanced learning workflows

## API Documentation

See docs/API.md.

## Database Schema

See docs/SCHEMA.md.

## Architecture Notes

See docs/ARCHITECTURE.md.

## Helper Scripts

- scripts/setup-local.sh: installs deps, checks DB, migrates, seeds
- scripts/dev-local.sh: starts API + Web in local mode
- scripts/dev-docker.sh: starts full stack using docker compose
- scripts/stop-docker.sh: stops docker compose services
