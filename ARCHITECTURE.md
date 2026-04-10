# Architecture and System Walkthrough

This document describes the current system architecture, data flow, and key modules based on the code in this repository.

## 1) High-Level Architecture

The system is split into two major parts:

- Backend: NestJS API with TypeORM and PostgreSQL.
- Frontend: React + TypeScript client with MUI and Vite.

The frontend calls the backend via REST API endpoints under `/api/*`. Authentication is JWT-based with refresh tokens.

## 2) Backend Overview (NestJS)

### Entry and Global Configuration

- `server/src/main.ts`
  - Bootstraps the Nest app.
  - Enables CORS for allowed origins from `CLIENT_URL`.
  - Adds `helmet` for security headers.
  - Applies global validation (`ValidationPipe`) to enforce DTO validation.
  - Prefixes all routes with `/api`.

- `server/src/app.module.ts`
  - Loads environment variables using `ConfigModule`.
  - Configures TypeORM with `DATABASE_URL`.
  - Registers domain modules: users, roles, auth, loans, savings, centers, members, collections, repayments, portfolio, transactions.
  - Applies global guards for JWT auth and role checks.

### Authentication Flow

Key files:
- `server/src/auth/auth.controller.ts`
- `server/src/auth/auth.service.ts`
- `server/src/auth/jwt.strategy.ts`
- `server/src/auth/roles.guard.ts`

Flow:
1. User logs in via `POST /api/auth/login`.
2. `AuthService` verifies credentials using bcrypt.
3. Access + refresh tokens are issued.
4. Refresh token hash is stored on the user record.
5. Subsequent API calls use `Authorization: Bearer <token>`.
6. Client can refresh tokens via `POST /api/auth/refresh`.
7. Global guards enforce auth and role access; `@Public` marks exceptions.

### Core Domain Modules

- Members (`server/src/members`)
  - CRUD and lookup by center.
- Centers (`server/src/centers`)
  - CRUD with pagination and search.
- Loans (`server/src/loans`)
  - Loan CRUD, eligibility checks, reloan workflow.
- Collections (`server/src/collections`)
  - Daily collections, grouped views, auto-generation, stats.
- Savings (`server/src/savings`)
  - Deposit/withdraw flows.
- Repayments (`server/src/repayments`)
  - Repayment creation and repayment schedule queries.
- Portfolio (`server/src/portfolio`)
  - Aggregated portfolio and projected income.
- Transactions (`server/src/transactions`)
  - Historical transaction queries.

### Data Model (TypeORM Entities)

- User and Role
  - `User` references `Role`, stores hashed refresh token.
- Center and Member
  - `Center` has many `Member` and many `Collection`.
  - `Member` belongs to one `Center`, and has many `Loan` and `Savings`.
- Loan
  - Tracks principal, interest, term, weekly payment, balance, net cash release.
  - Has many `LoanRepaymentSchedule` rows.
- Collection
  - Per-member per-day record with amount due, payment received, net release, and payment status.
- Repayment
  - Represents a repayment event, linked to a loan and a member.
- Repayment Schedule and Allocation
  - Schedule: per-week due/paid lines.
  - Allocation: splits a repayment across schedule entries.
- Savings
  - Member savings entries, optionally linked to loans.

### Data Persistence and Migrations

- TypeORM is configured in `server/src/data-source.ts`.
- Migrations live in `server/src/migrations` and run via `npm run migration:run`.

## 3) Frontend Overview (React)

### Entry and Routing

- `client/src/main.tsx`
  - Creates the React root and wraps routing with `AuthBootstrap`.

- `client/src/routes/index.tsx`
  - Defines routes for dashboard, members, centers, collections, portfolio, transactions.
  - Authenticated routes are protected by checking the Zustand auth store.

### API Client

- `client/src/utils/api.ts`
  - Axios instance with base URL from `VITE_API_URL`.
  - Adds `Authorization` header when a token is available.
  - On 401, tries refresh flow and retries original request.
  - Logs out user and redirects to `/login` if refresh fails.

### Auth State

- `client/src/features/auth/authStore.ts`
  - Zustand store, persisted in local storage.
  - Stores user, access token, refresh token, initialization state.

- `client/src/features/auth/AuthBootstrap.tsx`
  - On app load, refreshes session or fetches profile.
  - Ensures the app renders only after auth is initialized.

### Feature-Based UI

Each feature generally contains:
- `api.ts`: REST calls to the backend
- `types.ts`: shared feature types
- `hooks/`: state and data fetching logic
- `components/`: reusable UI pieces
- `pages/`: route-level screens

Examples:
- `client/src/features/member` handles member CRUD + modals.
- `client/src/features/collections` handles collection reporting, exports, and stats.

## 4) Collections Flow (End-to-End)

1. `CollectionsPage` loads daily and grouped collection summaries.
2. `CollectionDetailsModal` loads members for a center and merges collections by date.
3. Member status is computed in `memberStatus.ts` using:
   - Weekly payment amount
   - Expected total based on weeks elapsed
   - Actual payments received
4. The UI shows paid/partial/unpaid states based on those computations.
5. Exports:
   - Excel export uses `exportUtils.ts`.
   - PDF export uses `exportCollectorPdf.tsx` and renders tables with computed fields.

## 5) Security and Access Control

- All routes are protected by JWT guard and role guard unless `@Public` is applied.
- Role-based access uses `@Roles` decorator (e.g., `@Roles('admin')`).
- Tokens are short-lived; refresh tokens are stored hashed on the user record.

## 6) Environment and Configuration

Backend `.env` (server):
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `TYPEORM_SYNC`, `TYPEORM_RUN_MIGRATIONS`

Frontend `.env` (client):
- `VITE_API_URL`

## 7) Typical Request Flow

1. User logs in on the client.
2. Client stores tokens in Zustand and local storage.
3. API calls include `Authorization: Bearer <token>`.
4. If token expires, axios interceptor refreshes it automatically.
5. Backend validates JWT and role before hitting controller logic.

## 8) Where to Look for Specific Logic

- Auth and token handling: `server/src/auth`, `client/src/utils/api.ts`.
- Member status calculations: `client/src/features/collections/utils/memberStatus.ts`.
- PDF export rendering: `client/src/features/collections/utils/exportCollectorPdf.tsx`.
- Collections endpoints: `server/src/collections`.
- Loan calculations: `client/src/features/loans/utils/loanCalculations.ts`.

## 9) Known Documentation Gaps

- The old README described Express/MVC. The system now runs on NestJS.
- Update or remove any legacy docs that reference non-existent MVC folders.
