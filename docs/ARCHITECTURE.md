# Architecture

Frontend (React + Tailwind + Framer) -> Backend API (Express + Prisma) -> PostgreSQL -> AI Services -> Notification + Realtime Services

## Frontend Layer

- Route-based modular UI with role-aware dashboards
- API integration through centralized axios client
- Local auth store via Zustand + persistence
- Charts for analytics and realtime socket updates
- Smart search and premium glassmorphism-inspired UX

## Backend Layer

- Express modules grouped by domain route
- JWT auth and RBAC middleware
- Prisma data access and transaction-safe operations
- Service layer for AI logic, fine calculation, notification simulation
- Central error handling and validation middleware

## AI Service Layer

- Semantic tokenized search over title/author/description/tags
- Recommendation logic based on transaction history categories
- Forecasting from issue frequency and copy availability
- Chatbot intent handler for recommendations, fine policy, and contextual search
- Auto-tag generation from NLP-lite heuristics

## Security Strategy

- bcrypt hashing + JWT access tokens
- Role-based endpoint authorization
- Input validation (Zod)
- Helmet + CORS + strict JSON body limit
- No direct trust of client-provided role or metadata

## Scalability Notes

- Monorepo workspace organization for clean growth
- Prisma-ready for read replicas and migrations
- Route/service decomposition for horizontal scaling
- Realtime channel separated via socket events
- Docker setup for reproducible deployments
