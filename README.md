# Society Maintenance Hub

Production-oriented full-stack platform for housing society operations: residents, flats, maintenance billing, collections, expenses, service requests, announcements, reports and audit logs.

The original workspace had no existing frontend or backend source. This repository is a complete React + Express + MongoDB implementation.

## Features

- JWT authentication with bcrypt password hashing and role-based access (ADMIN / RESIDENT, extensible)
- Multi-society-ready data model (`societyId` on every major record) with isolation checks
- Buildings, flats, occupancy (owner / tenant / vacant)
- Monthly maintenance billing with duplicate-bill protection
- Payments (cash, UPI, bank transfer, cheque, online) with automatic bill status updates
- Configurable late-payment penalties (fixed or percentage, grace period, cap)
- Expenses, financial dashboard charts, and MongoDB-backed reports
- Maintenance requests with assignment, comments, and activity timeline
- Announcements with pin/important flags, expiry, and read tracking
- Society documents (metadata + external URL; storage providers abstracted for S3/Cloudinary)
- CSV export for residents, bills, payments, expenses and requests
- Audit log of important admin actions
- Seeded demo society: Sunrise Residency

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcryptjs, httpOnly cookie + Bearer token |

## Architecture

```
frontend (Vite :5173)
    ↓ REST / JSON
backend (Express :5000 /api)
    ↓ Mongoose
MongoDB (society-maintenance)
```

Money is stored as integer **paise** in MongoDB. APIs accept and return rupee amounts. Totals and penalties are calculated only on the backend.

## Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster (recommended) or MongoDB 6+ running locally

Set `MONGODB_URI` in `backend/.env`. Atlas example (replace USER and PASSWORD):

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/societymanagement?retryWrites=true&w=majority
```

On some Windows networks Node cannot resolve `mongodb+srv` (`querySrv ECONNREFUSED`). In that case paste Atlas’s **standard connection string** (the host list) into `MONGODB_URI` instead.

Never commit `backend/.env`. Copy `backend/.env.example` instead.

## Environment variables

Copy the examples and adjust secrets before production.

`backend/.env`

```
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/societymanagement?retryWrites=true&w=majority
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
COOKIE_SECURE=false
```

`frontend/.env`

```
VITE_API_URL=http://localhost:5000/api
```

Never commit real secrets. `JWT_SECRET` must be a long random value in production.

## Installation

```bash
npm run install:all
```

Or:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Running the app

From the repository root:

```bash
npm run dev
```

This starts:

- API: http://localhost:5000
- UI: http://localhost:5173

Individually:

```bash
npm run server
npm run client
```

## Seed the database

```bash
npm run seed
```

This **resets** demo collections and inserts Sunrise Residency sample data (buildings, flats, bills, payments, expenses, requests, announcements).

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | password |
| Treasurer | treasurer@example.com | password |
| Resident | resident@example.com | password |

Create your own society at `/register-society`. Residents join with the invite code from **Settings** (demo code: `SUNRISE1`).

These authenticate against MongoDB. There is no frontend-only fake login.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Frontend + backend |
| `npm run client` | Vite only |
| `npm run server` | Express only |
| `npm run seed` | Reset and seed MongoDB |
| `npm run test` | Backend Vitest suite |
| `npm run build` | Production build |

## API overview

All business routes except auth require `Authorization: Bearer <token>`.

- `POST /api/auth/register` `POST /api/auth/login` `POST /api/auth/logout` `GET /api/auth/me`
- `GET/PUT /api/society`
- `GET/POST /api/residents` `GET/PUT /api/residents/:id` `PATCH /api/residents/:id/status`
- `GET/POST /api/buildings` `GET/POST /api/flats`
- `GET /api/bills` `POST /api/bills/generate` `PUT /api/bills/:id` `POST /api/bills/:id/payment`
- `GET/POST /api/payments`
- `GET/POST/PUT/DELETE /api/expenses`
- `GET/POST /api/requests` `PUT /api/requests/:id` `POST /api/requests/:id/comments` `POST /api/requests/:id/assign`
- `GET/POST /api/announcements` `POST /api/announcements/:id/read`
- `GET /api/dashboard/admin` `GET /api/dashboard/resident`
- `GET /api/reports/financial|maintenance|expenses|requests|residents`
- `GET /api/exports/:type` (`residents` `payments` `bills` `expenses` `requests`)
- `GET /api/audit` `GET/POST /api/documents`

Consistent error shape:

```json
{ "success": false, "message": "Bill not found", "errorCode": "BILL_NOT_FOUND" }
```

## Production considerations

- Rotate `JWT_SECRET` and disable demo passwords
- Set `COOKIE_SECURE=true` and `NODE_ENV=production` behind HTTPS
- Restrict CORS `CLIENT_URL` to the real origin
- Use MongoDB Atlas (or replica set) with backups
- Plug `storageProvider` (`s3` / `cloudinary`) for document binaries; the current implementation stores metadata and URLs
- Residents recording a payment is a **manual acknowledgement** (cash/UPI reference). A payment gateway (Razorpay/Stripe) is not integrated yet
- Rate limiting is applied to login/register

## Tests

```bash
cd backend && npm test
```

Coverage includes money math, penalty rules, bill status, authentication, duplicate billing, partial/full payment, overpayment rejection, resident restrictions and society isolation. Integration tests use `mongodb-memory-server` (no local MongoDB required for the test run).
