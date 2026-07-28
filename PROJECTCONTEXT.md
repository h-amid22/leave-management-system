# PROJECT CONTEXT

## Project Name

Employee Leave Management System

## Description

A web application that allows employees to submit leave requests while managers and HR can review, approve, or reject them. The system tracks leave balances, leave history, and approval status.

---

## Goal

Build a secure and responsive leave management system using Next.js, Prisma, PostgreSQL (Supabase), and TypeScript.

---

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Tailwind CSS
- Server Components
- REST API

---

## User Roles

### Employee

- Login
- View profile
- Submit leave request
- View leave history
- Cancel pending request

### Manager

- Approve leave
- Reject leave
- View team leave requests
- View employee leave balances

### HR / Admin

- Manage employees
- Manage leave types
- View reports
- Configure company leave policies

---

## Core Features

- User authentication
- Role-based authorization
- Dashboard
- Leave request submission
- Leave approval workflow
- Leave balance tracking
- Leave history
- Email notifications
- Admin panel

---

## Database Entities

- User
- Department
- LeaveType
- LeaveRequest
- LeaveBalance
- Approval

---

## Relationships

Department
└── Users (1:M)

User
└── LeaveRequest (1:M)

LeaveType
└── LeaveRequest (1:M)

User
└── LeaveBalance (1:M)

LeaveRequest
└── Approval (1:M)

---

## API Endpoints

### Authentication

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/me

---

### Users

GET /api/users

GET /api/users/:id

PATCH /api/users/:id

---

### Leave Requests

GET /api/leave

POST /api/leave

GET /api/leave/:id

PATCH /api/leave/:id

DELETE /api/leave/:id

---

### Leave Types

GET /api/leave-types

POST /api/leave-types

PATCH /api/leave-types/:id

DELETE /api/leave-types/:id

---

### Leave Balance

GET /api/balance

PATCH /api/balance

---

## Authentication

Role-Based Access Control (RBAC)

Roles:

- Employee
- Manager
- HR
- Admin

---

## Business Rules

- Employees cannot approve their own leave.
- Managers can only approve employees in their department.
- HR/Admin can manage all leave requests.
- Leave balance must be checked before approval.
- Cancelled leave restores leave balance.
- Annual leave cannot exceed remaining balance.

---

## Current Progress

Leave Request API complete and verified. The development seed supports authentication
accounts, departments, leave types, effective policies, and current-year balances.

The employee leave experience is implemented with authenticated, responsive pages for:

- Dashboard overview and current balances.
- Paginated leave-request history.
- Creating and editing pending requests.
- Viewing request details and approval history.
- Cancelling pending requests with confirmation.

The UI consumes the existing API through a typed client and treats client-side role
checks as presentation only. Authentication, ownership, scope, and state-transition
authorization continue to be enforced by the API and service layer.

Authentication-based data isolation and role-aware navigation are verified. The
authoritative server resolver validates the Supabase user, maps its provider ID to one
active application user, and returns only the application ID, name, email, role,
department ID, and manager ID. Personal balance and history services always scope
queries to that resolved actor. Authenticated API fetches and responses use private,
no-store caching, and logout performs a full navigation so prior account UI state is
discarded.

The reported shared-data symptom was caused by every seeded role receiving the same
numeric development entitlements, not by shared user IDs or unrestricted personal
queries. Manual verification confirmed different application-user IDs and names for
Employee, Manager, HR, and Admin, with isolated request histories.

Frontend role access:

- Employee: Dashboard, My Leave, and Request Leave.
- Manager, HR, and Admin: all personal leave pages plus Pending Approvals.
- `/approvals` has a server layout guard and its APIs independently require Manager,
  HR, or Admin. Managers still receive only same-department direct reports from the
  service layer. Self-approval remains forbidden for every role.

The leave-request creation HTTP 500 was caused by passing the `days` calculation field
into Prisma's `userId_leaveTypeId_year` compound key. Balance lookup now constructs the
compound key explicitly from only `userId`, `leaveTypeId`, and `year`. Valid creation
returns 201, and past dates are now rejected consistently by the server as well as the
form.

Focused tests cover authoritative session mapping, no-store API requests, safe non-JSON
errors, role-aware navigation, the compound balance-key regression, server-side past
date validation, and the existing ownership, manager-scope, approval, and API rules.

The complete approval frontend is implemented at `/approvals`. It uses only the
authorized `GET /api/approvals/pending` response and provides employee-name search,
leave-type and department filters, submission/start-date sorting, request details,
and accessible approve/reject confirmation dialogs. Rejection requires a trimmed
comment of at most 1000 characters; approval accepts an optional comment. The action
payload contains only `comment`.

Approval contracts:

- `POST /api/leave-requests/:id/approve` accepts `{ comment?: string | null }`.
- `POST /api/leave-requests/:id/reject` accepts `{ comment: string }`.
- Both derive the approver, role, scope, status, and decision timestamp from trusted
  server state and return the updated request plus recorded approval.

Manager, HR, and Admin dashboards keep personal balances and requests separate from
the authorized approval count and upcoming queue. Request details show approver-safe
employee context, the applicable balance, timeline, decision comment, approver, and
decision time. Owner edit/cancel controls never render for a non-owner; approval
controls render only for a non-owner authorized role while the request is pending.

Approval and rejection wait for the server response before changing UI state. Success
removes the item from the local queue; conflicts and permission changes refetch server
state. Navigating back to dashboards or details performs no-store API fetches, so
approval counts, request status, and balances are refreshed without shared caches.

Manual seeded-account verification confirmed:

- Employee approval routes return 403 and `/approvals` redirects to `/forbidden`.
- A Manager sees and approves a same-department direct report, while an unrelated
  request returns 403.
- HR can reject an authorized request and the rejection reason is recorded.
- Admin self-owned requests are excluded from the queue and self-approval returns 403.

---

## Production Security Architecture (Phase 1)

Authentication uses Supabase Auth through server-only SSR clients. The browser receives
Supabase-managed secure session cookies; application code never reads tokens in client
JavaScript. The proxy refreshes sessions and redirects unauthenticated private-page
requests, while every protected API independently calls `requireCurrentUser`. That
resolver validates the token with Supabase and reloads the active application user on
every request. Disabled users therefore lose access immediately, and role or reporting
changes take effect on the next request. Logout calls Supabase sign-out and invalidates
the current refresh session. Session lifetime and refresh-token policies remain
configured in the Supabase project and must be reviewed before launch.

Authorization is enforced twice where appropriate: route helpers establish the minimum
role and service methods enforce ownership, direct-manager scope, HR/Admin scope, and
state-transition rules. Browser-supplied requester, approver, role, status, balance,
and decision fields are never trusted. Admin operations require an active Admin from
the authoritative server resolver.

All route parameters, query strings, and mutation bodies use strict Zod schemas. UUID,
enum, length, date, pagination, and unknown-field validation happens before service
execution. Services repeat business-critical validation against current database state.
Serializable approval/request transactions, optimistic balance updates, unique keys,
and conflict responses protect the principal concurrent workflows.

API errors use `{ error: { code, message, issues? } }` and expected failures map to
appropriate 4xx statuses. Unexpected failures return a generic 500 without database,
stack, or secret details. Structured server logs record only event categories and safe
error names/codes for authentication failures, authorization failures, conflicts,
invitation failures, rate-limit events, and unexpected exceptions. Tokens, cookies,
passwords, invitation URLs, request bodies, and personal data are excluded.

An in-process bounded fixed-window limiter currently protects login, employee search
and creation, leave creation and decisions, and balance initialization. A 429 response
includes `Retry-After`. This is defense in depth for a single application instance;
production horizontal scaling requires the Phase 2 distributed limiter below.

Browser security headers include CSP with restricted origins and `frame-ancestors`,
HSTS, nosniff, deny framing, a strict referrer policy, and a restrictive permissions
policy. Authenticated API data is private and never cached. The shared browser API
client uses same-origin credentials, consistent safe error parsing, and a 15-second
timeout; automatic mutation retries are intentionally not used.

### Remaining Production Work (Phase 2)

- Replace the in-memory limiter with an atomic Redis/platform implementation keyed by
  trusted edge identity plus authenticated user, and tune thresholds from telemetry.
- Configure and verify Supabase session lifetime, refresh-token reuse detection,
  password-reset throttling, MFA, breached-password checks, and global logout policy.
- Move CSP to per-request nonces so `script-src 'unsafe-inline'` can be removed while
  preserving Next.js hydration; deploy CSP reporting before enforcement changes.
- Add database-backed audit events, alert routing, log retention/redaction controls,
  tracing, availability monitoring, backups, restore drills, and incident runbooks.
- Add a database exclusion constraint or advisory locking for overlapping leave ranges
  and concurrency-safe protection for last-admin and policy-overlap invariants.
- Run dependency and container scanning in CI, establish patch SLAs, and commission
  penetration, accessibility, and disaster-recovery testing in the production topology.

---

## Production Operations Architecture (Phase 2)

### System and Request Architecture

The Next.js proxy is the request boundary. It assigns or preserves an `X-Request-ID`,
refreshes the Supabase session, records request timing, and returns the correlation ID
to the caller. API errors include the same safe identifier when the route supplies its
request, allowing an operator to join a user-visible failure to structured logs and
audit records. Private responses remain non-cacheable.

The application follows route → validator → authorization → service → Prisma. Supabase
establishes identity, but the active application user loaded from PostgreSQL remains
authoritative for role and scope. State changes continue to use existing transactions
and optimistic conflict checks.

### Logging and Monitoring

Operational logs are structured JSON written server-side. Entries contain timestamp,
level, event category, safe error classification, route/request correlation where
available, and never bodies, tokens, cookies, credentials, invitation links, or personal
records. `lib/observability/monitoring.ts` defines the provider boundary for Sentry,
Datadog, New Relic, or another backend. The default implementation is intentionally a
no-op; unexpected API exceptions are sent through this boundary without exposing them
to clients. Provider configuration must happen once during process bootstrap.

### Persistent Audit Architecture

`AuditEvent` is a dedicated append-only business ledger with actor identity snapshots,
target, action, safe JSON metadata, request correlation, and optional network/client
context. No application update or delete API exists. The migration explicitly documents
that the production runtime database role must receive only INSERT/SELECT privileges on
this table. Audit metadata is allow-listed at each call site; raw request bodies and
authentication material are prohibited.

The Admin audit workspace and `/api/admin/audit` both use server-side Admin authorization.
Queries are paginated and indexed for timestamp, action, actor, entity, and request ID,
with search, date, action, actor, entity, and sort filters. Metadata is displayed in an
explicit expandable element rather than injected as HTML.

### Metrics Strategy

The lightweight metrics registry exposes counters plus average request duration. Current
counters cover requests, failures, authentication/authorization failures, leave creation,
approvals, rejections, and invitations. It is deliberately adapter-friendly and carries
no high-cardinality user, entity, IP, or request labels. The in-memory registry is useful
for one process; production deployment should export increments and histograms directly
to the platform metrics backend rather than aggregate across instances in memory.

### Health and Readiness

`GET /api/health` is a liveness check returning status and timestamp without touching
dependencies. `GET /api/ready` validates required environment configuration and performs
a minimal database query. It returns only named check status, timestamp, and request ID;
connection strings and exception details are never returned. Load balancers should use
readiness for traffic admission and liveness only for process restart decisions.

### Background Jobs and Notifications

`BackgroundJob` and `JobDispatcher` define named, typed, idempotency-keyed work. The
notification interface supports email, in-app, SMS, Slack, and Teams without coupling
domain services to providers. The current adapters intentionally perform no delivery.
A future durable queue adapter should persist jobs in the same transaction as business
state through an outbox, then workers should claim jobs, retry with bounded exponential
backoff, and move exhausted jobs to a dead-letter queue. API responses must not wait for
external delivery.

### Operational Runbook

1. For an incident, record start time, affected environment, symptoms, and incident lead.
2. Use the reported `X-Request-ID` to locate structured logs and the immutable audit event.
3. Check `/api/health`, `/api/ready`, error rate, latency, database connections, Supabase
   status, and deployment changes. Never paste secrets or complete personal records into
   incident channels.
4. Contain through rollback, traffic isolation, account disablement, or feature shutdown;
   preserve audit/log evidence before remediation.
5. Restore service, verify readiness and core leave/auth flows, monitor recurrence, notify
   stakeholders, and complete a blameless post-incident review with owned actions.

### Deployment Checklist

- Apply Prisma migrations using the deploy command before routing traffic.
- Confirm runtime DB privileges make `AuditEvent` append-only and backup policies include it.
- Validate required environment variables, Supabase URL/keys, secret rotation, session/MFA
  policy, trusted proxy headers, HTTPS/HSTS, CSP, and distributed rate limiting.
- Configure monitoring provider, log shipping/redaction/retention, metrics dashboards,
  alert thresholds, readiness probes, backups, and on-call ownership.
- Run typecheck, lint, tests, production build, production dependency audit, migration
  smoke test, and a seeded authentication/authorization workflow in staging.

### Recovery Procedure

Declare the recovery point and time objectives before launch. For data loss, stop writes,
preserve evidence, restore the latest verified database backup to an isolated environment,
replay supported transaction logs, validate schema and audit continuity, then perform
role-based authentication and leave-workflow checks before controlled cutover. Rotate
credentials if compromise is suspected. Document data gaps and never manufacture audit
records to hide them.

### Remaining Work Before Production

- Make audit emission transactional for every remaining Admin mutation using an outbox or
  shared transaction boundary, including resend/adjustment operations when implemented.
- Persist authentication/authorization failure audits through a reliable security-event
  sink that cannot amplify an outage when the primary database is unavailable.
- Replace process-local rate limits and metrics with distributed/hosted implementations.
- Install and configure the selected monitoring/log/metrics providers and React error boundary.
- Implement durable queue workers, retries, dead-letter operations, notification providers,
  delivery observability, and idempotent outbox dispatch.
- Perform staging migration/rollback drills, backup restoration, load testing, alert tests,
  accessibility audit, penetration testing, and formalize SLOs/on-call escalation.
- Approval deducted Annual balance exactly once; a repeated approval returned 409 and
  did not deduct again.
- Rejection left Sick balance unchanged.
- Both decisions disappeared from pending scope and displayed approver and decision
  timestamps in request details.

---

## Development Seed Data

The idempotent development seed creates:

- Employee, Manager, HR, and Admin test accounts.
- Engineering and Human Resources departments.
- Annual Leave, Sick Leave, and Unpaid Leave types.
- Full-year effective policies for the current development year.
- Current-year leave balances for every seeded account.

No pending request is seeded. Create one with the Leave Request API so manual
testing can choose dates without conflicting with deterministic seed records.

Run the seed explicitly with `npm run db:seed`. Seeded accounts use the password
configured in `SEED_USER_PASSWORD`; the password is never printed.

---

## TODO

- Build manager dashboard
- Add notifications
- Expand integration and end-to-end testing

---

## Admin Management Workspace

The Admin milestone is implemented under `/admin` and is restricted to authenticated,
active `ADMIN` users at both the server-rendered layout and every `/api/admin/*` route.
Employee, Manager, and HR accounts are redirected to `/forbidden` for pages and receive
HTTP 403 from Admin APIs. Database access and the authoritative role checks remain in
`AdminService`; route handlers only authenticate, validate, and serialize responses.

The persistent sidebar is the single Admin navigation source; the former duplicated
horizontal Admin tab row has been removed. Admin destinations are grouped as Overview
(`Admin overview`), People (`Employees`, `Departments`), Leave (`Policies`, `Leave
types`, `Balances`), and System (`Audit log`, `Settings`). Exact matching keeps only
`/admin` active for the overview, while nested employee and policy routes activate their
parent destinations. At tablet and mobile widths the Admin sidebar becomes a
keyboard-accessible drawer with Escape handling, focus containment, and focus return to
the menu trigger. Non-Admin navigation is unchanged.

Implemented capabilities:

- Organization summary metrics derived on the server from current database records.
- Searchable, filterable, sortable, paginated employee directory and sanitized employee
  detail views.
- Supabase invitation-based employee provisioning with server-only credentials, app-user
  creation, assignment validation, and current-year balance initialization.
- Employee role, department, manager, active-status updates, protection for the last
  active Admin, and non-destructive deactivation.
- Department creation, rename, description update, activation, and safe deactivation.
- Leave-type creation, display-name/payment update, activation, and safe deactivation;
  stable codes cannot be edited.
- Effective-dated organization-wide leave-policy creation and future-policy editing,
  with overlap validation and protection for current/historical policy records.
- Leave-balance filtering plus idempotent preview/confirmation/initialization for a
  selected year. Existing balances and usage are never overwritten.

Admin APIs use strict Zod validation, `{ data }` or `{ data, meta }` responses, private
no-store cache headers, sanitized contracts, and mapped 400/401/403/404/409/502 errors.
Client input is never trusted for actor identity, role, Supabase linkage, balance usage,
or other protected values.

Confirmed schema limitations are represented honestly instead of inferred or faked:

- There is no audit-event model, so `/admin/audit` explains that trustworthy
  cross-resource administrative activity is unavailable. Approval history remains the
  only persisted action history.
- There is no leave-balance adjustment ledger, so direct manual balance changes are not
  exposed. Initialization is safe and idempotent, but auditable adjustments require a
  future approved schema addition.
- Departments do not own a manager and policies have no department/role targeting.
  Reporting scope therefore uses `User.managerId` plus department membership, while
  current policies are organization-wide.

Manual role verification confirmed Employee, Manager, and HR rejection, Admin page/API
access, real seeded organization metrics, policy-overlap conflicts, and repeatable
balance initialization without changing used or remaining balances. A future Annual
Leave policy for 2027 was added during manual verification. After rotating the Supabase
secret, the server-only Admin client was updated to disable URL-session detection and
the Supabase JavaScript client was patched to 2.110.8. Sanitized diagnostics confirmed
the expected project host and opaque `sb_secret_` format, `auth.admin.listUsers()` and
`inviteUserByEmail()` succeeded, the temporary invited identity was deleted, all four
seeded accounts authenticated, and two consecutive seed runs completed successfully.
No secret, access token, password, cookie, or invitation link was logged.

Admin-focused automated coverage includes page/API role denial, route validation and
sanitization, service authorization and invariants, employee-directory interaction, and
strict validator behavior. The full suite currently contains 97 passing tests across 20
files.

Dependency hardening updated Next.js and its ESLint configuration to 16.2.11 and the
Prisma packages to 7.9.0. Prisma's patched dependency chain removed the Hono and
`fast-uri` findings. A narrow Sharp 0.35.3 override replaces Next's vulnerable optional
Sharp 0.34.x dependency; the production build verifies compatibility. `npm audit`
reports zero known vulnerabilities.

There is no separate browser automation suite yet. Component tests cover approval
loading, empty/error states, dialog validation, duplicate action prevention, successful
queue removal, conflict refresh, role navigation, and server authorization behavior.

Approval history is visible per request through its authorized detail response. A
cross-request `/approvals/history` page is not implemented because there is no backend
endpoint that can return a properly scoped decision history; the pending endpoint is
not reused as an unsafe workaround.

The current duration preview uses inclusive calendar days. Weekend, holiday, and
partial-day calculations are not included unless the domain rules are expanded.

---

## Frontend Design System

The authenticated frontend uses an original premium HR SaaS design language informed
by modern modular workforce products. No third-party layouts, illustrations, or
proprietary assets are copied.

Visual tokens:

- Primary emerald: `#2f7256`, with `#245b44` for active and hover emphasis.
- Soft mint: `#e7f3ed` and `#dff1e7` for selected navigation, icons, and calm accents.
- Canvas: `#f4f7f5`; surfaces remain white with subtle green-neutral borders.
- Charcoal: `#17231e`; secondary text uses `#69766f`.
- Semantic amber, red, and green are reserved for pending, destructive/error, and
  approved/success states.

Typography uses an Inter-first system stack with compact labels, readable body copy,
and a strong, spacious heading hierarchy. Layout spacing follows an 8-point rhythm,
with 18–22px card radii, quiet shadows, and consistent 44px minimum controls.

Layout conventions:

- Desktop uses a collapsible workspace sidebar, sticky top bar, and a centered content
  canvas up to 1240px wide.
- Tablet reduces navigation and content widths without introducing horizontal scroll.
- Mobile replaces the sidebar with a sticky header and role-aware bottom navigation;
  grids and action groups collapse to single-column layouts.
- Motion is limited to short fades, hover elevation, and control feedback, and is
  disabled by the reduced-motion media query.

Shared UI components include `UserAvatar`, `PageHeader`, `MetricCard`,
`LoadingSkeleton`, `StatusBadge`, `EmptyState`, `ErrorState`, and the reusable approval
and cancellation dialogs. These components standardize icons, typography, states,
focus treatment, spacing, and actions across dashboard, leave history, forms, request
details, approvals, forbidden, and login screens.

Loading views use screen-reader-labelled skeletons instead of spinner-only feedback.
Dialogs use native modal semantics, labelled titles and descriptions, keyboard Escape
handling, focus containment, and focus restoration. All controls retain visible focus
states and status information is communicated with both text and color.

---

## Notes

This project is intended to demonstrate:

- Clean architecture
- Secure authentication
- Role-based authorization
- Proper database design
- Scalable API design
- Responsive UI
