# Resource Reservation Management System

A full-stack system for reserving shared organisational resources (meeting rooms, projectors,
workstations and company vehicles) **without double bookings**. Built for the PrimeWave Lab Software
Engineering Internship technical assessment.

It consists of **two websites** and one API:

| App | URL (dev) | Who uses it | What it does |
|---|---|---|---|
| **User website** (`apps/user`) | http://localhost:3000 | Employees | Sign up and log in, see a personal dashboard, browse resources, check availability, book, and manage *their own* bookings |
| **Admin website** (`apps/admin`) | http://localhost:3001 | The administrator | **Login only** (the account is configured in `.env`), see an organisation-wide dashboard, manage resources, see and manage *all* reservations, view users |
| **API** (`apps/backend`) | http://localhost:4000 | Both websites | REST API: authentication, authorisation and business rules. The only component that talks to PostgreSQL. |

Double booking is prevented by PostgreSQL itself, using an exclusion constraint, so two
simultaneous requests for the same slot can never both succeed.

---

## Main features

**User website**
- Sign up, log in and log out, with an httpOnly session cookie.
- Dashboard: total resources, resources available right now, my bookings today, my upcoming
  bookings.
- Browse resources with search and category filters, and open resource details.
- Availability search for a time window. Free resources can be booked in one click; busy ones show
  when they are booked, but not by whom.
- Book through a validated form. Conflicts are rejected with a clear message.
- My bookings: filter by status, timeframe and dates; open details; edit the purpose; cancel;
  "Book again".

**Admin website**
- **Login only, no signup.** The single administrator account is defined in `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Dashboard: active and inactive resources, bookings on a selected day, upcoming confirmed bookings,
  resources available now, cancelled bookings, users, the day's schedule, recent bookings, and
  resources per category.
- Resource management: create, edit, activate or deactivate, search and filter. A resource can only
  be deleted if it has never been booked.
- All reservations: filter, cancel any booking, book on someone's behalf.
- Availability, including inactive resources and who booked each slot.
- Users list (read-only) with role filter and booking counts.

**Platform**
- Role-based access control enforced by the API. Users only see active resources and their own
  bookings; admin endpoints require an admin session.
- Double-booking prevention with a PostgreSQL **exclusion constraint**. Bookings use half-open
  intervals (back-to-back is fine), and cancelled bookings never block.
- Responsive layouts: a sidebar for admins, top navigation and a drawer for users. Loading, empty
  and error states throughout, plus confirmation dialogs, toasts and accessible forms.

## Accounts

| Website | Email | Password | Where it comes from |
|---|---|---|---|
| Admin website (http://localhost:3001) | value of `ADMIN_EMAIL` | value of `ADMIN_PASSWORD` | `.env`. This is the **only** account that can log in to the admin website. |
| User website (http://localhost:3000) | `user@example.com` | `User@12345` | Demo account from `npm run db:seed`. Anyone can also sign up. |

The admin website has **no signup page**. To change the admin login, edit `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `.env` and restart the API. The account is created or updated from these
values at the next admin login (and by `npm run db:seed`). The admin email is reserved, so nobody
can register it on the user website. The administrator can also use the user website.
**Use a strong admin password, and remove the demo user, in any shared environment.**

## Technology stack

| Area | Technology |
|---|---|
| Websites | Next.js 16 (App Router, React 19, Server Components) · TypeScript |
| API | Next.js 16 Route Handlers (a separate app) · TypeScript |
| Database | PostgreSQL (tested on 17) · Prisma ORM 7 with the `pg` driver adapter |
| Authentication | Server-side sessions in PostgreSQL, httpOnly cookies, scrypt password hashing (Node `crypto`) |
| Validation | Zod 4 (API and forms) · React Hook Form |
| UI | Tailwind CSS 4 · shadcn/ui (Radix) · Lucide icons · Sonner toasts |
| Testing | Vitest 4 (unit and integration) · Playwright (end-to-end, desktop and mobile) |
| Tooling | npm workspaces · ESLint 9 (`eslint-config-next`) · TypeScript strict mode |

## Architecture overview

```
 User website :3000 ─┐                      ┌──────────────────────────────────┐
  (apps/user)        │  HTTP/JSON + cookie  │ API :4000 (apps/backend)          │
                     ├─────────────────────►│ proxy.ts (CORS) → Route Handlers  │──Prisma──► PostgreSQL
 Admin website :3001 ┘  x-portal: user|admin│ → auth guard → Controllers        │
  (apps/admin)                              │ → Services → Repositories         │
                                            └──────────────────────────────────┘
        └──── packages/web (shared UI, API client, page views) ──── packages/shared (types, rules) ────┘
```

- **The websites never access the database.** They call the REST API through
  `packages/web/src/lib/api-client.ts`.
- **The API decides who can do what.** Every request is authenticated from its session cookie, and
  each website has its own cookie (`rrms_session` and `rrms_admin_session`). Admin endpoints
  require an ADMIN account logged in on the admin website.
- **Shared code** lives in `packages/web` (UI components, API client, and page views used by both
  websites) and `packages/shared` (API types, limits and timezone helpers).
- See **[docs/architecture.md](docs/architecture.md)** for request flows, authentication, the
  concurrency strategy and timezone handling.

## Folder structure

```
.
├── apps/
│   ├── backend/                     # REST API - the only component that talks to PostgreSQL
│   │   ├── prisma/                  # schema.prisma · migrations/ (incl. hand-written SQL) · seed.ts
│   │   ├── src/app/api/             # Route Handlers: auth, me, dashboard, resources, reservations, users, …
│   │   ├── src/modules/             # auth · resources · reservations · availability · dashboard · users · …
│   │   ├── src/lib/                 # auth (sessions/guards), password, env, prisma, api-response, …
│   │   ├── src/proxy.ts             # CORS for the two websites
│   │   └── tests/                   # unit/ · integration/ (real route handlers + test database)
│   ├── user/                        # User website (port 3000)
│   │   └── src/app/                 # (auth)/login, signup · (site)/ dashboard, resources, availability, reservations
│   └── admin/                       # Admin website (port 3001)
│       └── src/app/                 # (auth)/login, signup · (console)/ dashboard, resources, reservations, availability, users
├── packages/
│   ├── web/                         # Shared UI: components (ui, auth, reservations, views, …), API client, form schemas
│   └── shared/                      # API contract types, constants, timezone helpers
├── e2e/                             # Playwright: admin/ · user/ specs, helpers, e2e database preparation
├── docs/                            # architecture, ER diagram, API docs, demo outline
├── playwright.config.ts
├── .env.example
└── package.json                     # npm workspaces + root scripts
```

## Prerequisites

- **Node.js 20.9 or newer.** Developed with Node 24.
- **npm 10 or newer.** Install with the committed `package-lock.json`.
- **PostgreSQL 14 or newer**, including the standard `btree_gist` contrib extension. It ships with
  the official installers and Docker images.

## Installation

```bash
git clone <your-fork-url> resource-reservation-system
cd resource-reservation-system
npm install            # installs all workspaces and generates the Prisma client
```

### 1. Create the PostgreSQL databases

```sql
-- psql -U postgres
CREATE DATABASE resource_reservation_db;    -- development
CREATE DATABASE resource_reservation_test;  -- integration tests (wiped on every run)
CREATE DATABASE resource_reservation_e2e;   -- end-to-end tests (wiped on every run)
```

The first migration creates the `btree_gist` extension. The database user needs permission to
create extensions; the database owner or a superuser does, which is the default locally.

<details><summary>Using Docker instead</summary>

```bash
docker run --name rrms-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
docker exec -it rrms-postgres psql -U postgres -c "CREATE DATABASE resource_reservation_db;" -c "CREATE DATABASE resource_reservation_test;" -c "CREATE DATABASE resource_reservation_e2e;"
```
</details>

### 2. Configure environment variables

```bash
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
```

| Variable | Used by | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | API, Prisma | `postgresql://USER:PASSWORD@localhost:5432/resource_reservation_db` | Server-only secret |
| `TEST_DATABASE_URL` | integration tests | `…/resource_reservation_test` | **Wiped** on each run. Its name must contain `test`. |
| `E2E_DATABASE_URL` | Playwright | `…/resource_reservation_e2e` | **Wiped** on each run. Its name must contain `e2e`. |
| `FRONTEND_ORIGIN` | API (CORS) | `http://localhost:3000,http://localhost:3001` | The two websites' origins |
| `ADMIN_EMAIL` | API, seed | `admin@example.com` | The administrator's login email (the only admin account) |
| `ADMIN_PASSWORD` | API, seed | a strong password | The administrator's password. Server-only; never exposed to the browser. |
| `COOKIE_DOMAIN` | API (optional) | `.example.com` | Production only, when the websites and API share a parent domain |
| `NEXT_PUBLIC_API_BASE_URL` | both websites | `http://localhost:4000` | Public. Where the websites reach the API. |
| `NEXT_PUBLIC_APP_TIMEZONE` | both websites | `UTC`, `Asia/Colombo` | IANA timezone used to display and enter times |

There is one `.env` at the repository root, shared by all apps and the Prisma CLI. It is git-ignored,
and each app validates its variables at startup.

### 3. Run migrations and seed data

```bash
npm run db:migrate      # applies all migrations to DATABASE_URL
npm run db:seed         # demo accounts, 4 categories, 9 resources, 7 sample bookings; safe to re-run
```

Use `npm run db:migrate:deploy` in CI or production. To browse the data, run `npm run db:studio`.

## Running the applications

| Command | What it does |
|---|---|
| `npm run dev` | Starts **all three** with live reload: user website :3000, admin website :3001, API :4000 |
| `npm run dev:user` | User website only (needs the API) |
| `npm run dev:admin` | Admin website only (needs the API) |
| `npm run dev:backend` | API only. Check http://localhost:4000/api/health |
| `npm run build` | Production builds of the API, user website and admin website |
| `npm start` | Runs the three production builds (after `npm run build`) |

## Testing

```bash
npm run lint            # ESLint, all workspaces
npm run typecheck       # TypeScript, all workspaces + e2e specs
npm test                # unit + integration tests (needs PostgreSQL and TEST_DATABASE_URL)
npx playwright install chromium   # once, before the first e2e run
npm run test:e2e        # builds all apps and runs Playwright (ports 3100/3101/4100)
```

| Suite | Location | Covers |
|---|---|---|
| Shared unit tests | `packages/shared/tests` | Timezone conversions, including daylight-saving days |
| Web unit tests | `packages/web/tests` | Booking-form validation, timezone-aware formatting, URL parameters |
| API unit tests | `apps/backend/tests/unit` | Overlap rule, Zod schemas |
| API integration tests | `apps/backend/tests/integration` | Every endpoint against a freshly migrated test database: auth (signup, login, logout, sessions, env-configured admin), **authorisation** (roles, ownership, privacy), validation, filters, deletion policy, and the **simultaneous-booking test** |
| End-to-end | `e2e/admin`, `e2e/user` | Admin login (no signup page), resource management, booking and conflicts, cancellation, availability; user signup, login and logout, booking and cancelling own bookings, privacy, mobile layout |

## API endpoint summary

Full details are in **[docs/api-documentation.md](docs/api-documentation.md)**.
"User" means any logged-in account; "Admin" means an ADMIN account on the admin website.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness and database check |
| POST | `/api/auth/signup` | Public | Create a USER account and log in (user website only; refused on the admin website) |
| POST | `/api/auth/login` | Public | Log in to the calling website |
| POST | `/api/auth/logout` | Public | End the current session |
| GET | `/api/auth/me` | User | The logged-in account |
| GET | `/api/me/dashboard` | User | Personal dashboard |
| GET | `/api/dashboard` | Admin | Organisation-wide dashboard |
| GET | `/api/users` | Admin | List accounts |
| GET | `/api/resource-categories` | User | Categories |
| GET | `/api/resources` | User | List resources (users only see active ones) |
| POST | `/api/resources` | Admin | Create a resource |
| GET | `/api/resources/:id` | User | Details (users: active only, own bookings only) |
| PATCH | `/api/resources/:id` | Admin | Update or activate/deactivate |
| DELETE | `/api/resources/:id` | Admin | Delete, only if the resource has never been reserved |
| GET | `/api/reservations` | User | List (users: their own; admins: all) |
| POST | `/api/reservations` | User | Book (409 on overlap) |
| GET | `/api/reservations/:id` | User | Details (users: their own only) |
| PATCH | `/api/reservations/:id` | User | Edit the purpose (admins can also change "booked for") |
| POST | `/api/reservations/:id/cancel` | User | Cancel (users: their own; admins: any) |
| GET | `/api/reservations/availability` | User | Availability for a time window |

## ER diagram

See **[docs/er-diagram.md](docs/er-diagram.md)**. In short: `User 1─* Session`,
`User 1─* Reservation`, `ResourceCategory 1─* Resource 1─* Reservation`. All keys are UUIDs, all
timestamps are `TIMESTAMPTZ`, and deletes are restricted where history matters.

## Important design decisions

1. **Double booking is prevented by the database.**
   `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status = 'CONFIRMED')`
   atomically rejects overlapping confirmed bookings. The API's pre-check only produces a friendly
   message; a constraint violation maps to the same `409 RESERVATION_CONFLICT`. A test fires 10
   simultaneous requests and asserts exactly one succeeds.
2. **Server-side sessions instead of JWTs.** Logout and revocation take effect immediately (the
   session row is deleted). Cookies are `httpOnly` and `SameSite=Lax`, and `Secure` in production.
   Only a SHA-256 hash of each session token is stored. Passwords use scrypt with a per-password
   salt, and unknown emails and wrong passwords get the same error and similar response times.
3. **Two websites, two sessions.** Each site sends `x-portal: user|admin` and has its own cookie.
   An admin session is only issued to, and only accepted for, the account in `ADMIN_EMAIL`. If
   that email changes or the account loses the role, its admin session stops working immediately.
4. **Authorisation lives in the API.** Users can't see inactive resources or other people's bookings
   (they get a 404, so existence isn't leaked). Availability hides who booked a slot. Users book
   under their own name; only admins can book on someone's behalf.
5. **One administrator, defined in `.env`.** The admin website has login only. The API checks
   `ADMIN_EMAIL` and `ADMIN_PASSWORD` (constant-time comparison) and keeps the database account in
   sync with them. Admin sessions stop working if the configured email changes, and no other
   account can ever get admin access.
6. **Half-open intervals and explicit status transitions.** `CONFIRMED → CANCELLED` is the only
   transition and it is final. "Book again" creates a new booking that passes every check.
7. **History is never lost.** Booked resources can't be deleted (they are deactivated instead), and
   ended or cancelled bookings can't be modified.
8. **Unambiguous time.** The database stores `TIMESTAMPTZ` instants; the API only accepts ISO
   strings with an offset; the UI uses one configured IANA timezone.
9. **No duplicated UI.** Both websites render the same shared views from `packages/web`, with small
   `variant` differences, so a fix applies to both.

## Known limitations

- There is no password reset, email verification or "remember me" option. Sessions last 7 days.
- There is no rate limiting on login and signup yet. Add it (or a WAF) before exposing the API
  publicly.
- There is exactly one administrator account (from `.env`); the users list is read-only.
- Categories are managed through the seed and migrations.
- The booking form's resource dropdown loads up to 100 active resources (the API's maximum page
  size).
- There are no recurring bookings or notifications. Rescheduling is done by cancelling and rebooking.
- In production the websites and API must share a parent domain (configure `COOKIE_DOMAIN`), or the
  API must be proxied under each website's domain, so the session cookie is first-party.
- `npm audit` reports advisories in `mysql2`, which the **Prisma CLI** (a development tool) bundles
  for MySQL support. This project only uses PostgreSQL, so that code is never executed.

## Future improvements

- Password reset and email verification; user and role management for admins; audit log.
- Rate limiting and account lockout on repeated failed logins.
- A calendar or timeline view, recurring reservations and in-place rescheduling (still protected by
  the exclusion constraint).
- Notifications (email or Slack), ICS export, resource images.
- An OpenAPI specification generated from the Zod schemas; a CI pipeline running lint, typecheck,
  tests and e2e against a PostgreSQL service container.

## License

[MIT](LICENSE)
