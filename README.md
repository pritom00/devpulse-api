# DevPulse API

A modular, production-ready issue-tracking REST API built with Node.js, TypeScript, Express, and PostgreSQL.

**Live URL:** `https://devpulse-api-1e9l.onrender.com/health`

---

## Features

- JWT-based authentication with role-based access control (`contributor` / `maintainer`)
- Full issue lifecycle management (create, read, update, delete)
- Maintainer can change issue workflow status independently
- Dynamic filtering and sorting for issue lists
- Internal system metrics endpoint for maintainers
- Raw SQL via `pg` — no ORMs, no query builders, no SQL JOINs
- Strict TypeScript — zero `any` types
- Modular architecture: clean separation of routes, controllers, utils, middleware
- DRY helpers for responses, validation, and SQL queries
- CORS configured for multi-origin support
- Auto-initialises database tables on first boot

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 (LTS) |
| Language | TypeScript 5 |
| Framework | Express.js |
| Database | PostgreSQL (NeonDB) |
| Auth | jsonwebtoken + bcrypt (salt rounds: 10) |
| Status codes | http-status-codes |
| Deployment | Render |

---

## Setup

### Prerequisites
- Node.js 20+
- A PostgreSQL database (NeonDB recommended for free tier)

### Installation

```bash
git clone https://github.com/pritom00/devpulse-api.git
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

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/metrics` | Maintainer only | Get system metrics |

> *Contributors can only edit their own issues when status is `open`. Maintainers can edit any issue and change workflow status.

### Authorization Header Format

```
Authorization: <JWT_TOKEN>
```

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|-------|--------|---------|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

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

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| `contributor` | Register, login, create issues, view all issues, update own open issues |
| `maintainer` | All contributor permissions + update any issue, change status, delete issues, view metrics |

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful GET, PATCH, DELETE |
| `201` | Successful POST (resource created) |
| `400` | Validation errors, invalid input |
| `401` | Missing, expired, or invalid JWT |
| `403` | Valid token but insufficient permissions |
| `404` | Resource not found |
| `409` | Business logic conflict |
| `500` | Unexpected server error |

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
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   └── admin.routes.ts
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

---

## Deployment

Deployed on **Render** with **NeonDB** (PostgreSQL).

### Render Setup
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: All variables configured in Render dashboard

### Redeploy
Push to `main` branch — Render auto-deploys on every push.