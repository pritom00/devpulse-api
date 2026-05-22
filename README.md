# DevPulse API

A modular, production-ready issue-tracking REST API built with Node.js, TypeScript, Express, and PostgreSQL.

**Live URL:** `https://devpulse-api.vercel.app` *(update after deployment)*

---

## Features

- JWT-based authentication with role-based access control (`contributor` / `maintainer`)
- Full issue lifecycle management (create, read, update, delete)
- Dynamic filtering and sorting for issue lists
- Raw SQL via `pg` — no ORMs, no query builders
- Strict TypeScript — zero `any` types
- Modular architecture: clean separation of routes, controllers, utils, middleware
- DRY helpers for responses, validation, and SQL queries
- CORS configured for multi-origin support
- Auto-initialises database tables on first boot

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24 (LTS) |
| Language | TypeScript 5 |
| Framework | Express.js |
| Database | PostgreSQL (NeonDB / Supabase / ElephantSQL) |
| Auth | jsonwebtoken + bcrypt |
| Status codes | http-status-codes |

---

## Setup

### Prerequisites
- Node.js 24+
- A PostgreSQL database (NeonDB recommended for free tier)

### Installation

```bash
git clone https://github.com/your-username/devpulse-api.git
cd devpulse-api
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |

### Running Locally

```bash
npm run dev      # development with hot reload
npm run build    # compile TypeScript
npm start        # run compiled output
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Authenticate and get JWT |

### Issues

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/issues` | Public | List all issues (with filters) |
| GET | `/api/issues/:id` | Public | Get a single issue |
| POST | `/api/issues` | Authenticated | Create an issue |
| PATCH | `/api/issues/:id` | Authenticated* | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer only | Delete an issue |

> *Contributors can only edit their own issues when status is `open`. Maintainers can edit any issue.

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|-------|--------|---------|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

### Authorization Header Format

```
Authorization: <JWT_TOKEN>
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | Auto-increment |
| `name` | VARCHAR(255) | Required |
| `email` | VARCHAR(255) | Unique, required |
| `password` | VARCHAR(255) | bcrypt hash, never returned in responses |
| `role` | VARCHAR(20) | `contributor` (default) or `maintainer` |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

### `issues`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | Auto-increment |
| `title` | VARCHAR(150) | Required, max 150 chars |
| `description` | TEXT | Required, min 20 chars |
| `type` | VARCHAR(20) | `bug` or `feature_request` |
| `status` | VARCHAR(20) | `open` (default), `in_progress`, `resolved` |
| `reporter_id` | INTEGER | References `users.id` (app-level validation) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Render / Railway

Point the start command to `npm start` and set environment variables in the platform dashboard.

---

## Project Structure

```
src/
├── config/
│   ├── database.ts       # pg Pool instance
│   ├── init.ts           # CREATE TABLE IF NOT EXISTS on boot
│   └── jwt.ts            # JWT config
├── middleware/
│   ├── auth.ts           # authenticate + authorize middleware
│   └── errorHandler.ts   # global error handler
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.routes.ts
│   └── issues/
│       ├── issues.controller.ts
│       └── issues.routes.ts
├── utils/
│   ├── queries.ts        # reusable raw SQL helpers
│   ├── response.ts       # sendSuccess / sendError
│   ├── types.ts          # all TypeScript interfaces
│   └── validators.ts     # input validation functions
├── app.ts                # Express app factory
└── index.ts              # server entry point
```
