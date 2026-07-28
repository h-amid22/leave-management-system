# Leave Management System

A production-oriented leave request and approval application built with Next.js,
TypeScript, Prisma, PostgreSQL, and Supabase Auth.

## Requirements

- Node.js 22+
- PostgreSQL (the hosted setup uses Supabase)
- A Supabase project with email/password authentication enabled

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install dependencies with `npm ci`.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply migrations with `npm run db:migrate`.
5. Optionally create development data with `npm run db:seed`.
6. Start the app with `npm run dev`.

Before opening a pull request, run `npm run check`. It runs linting, static type
checks, the test suite, and a production build.

## Production configuration

The application requires these environment variables at runtime:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL used by the running application |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase Auth key |

Deployment/migration jobs additionally require `DIRECT_URL`, a direct or
session-mode PostgreSQL URL. `SUPABASE_SECRET_KEY` and `SEED_USER_PASSWORD` are
only needed for seeding and must not be provided to the web container.

## Release procedure

1. Build an immutable image: `docker build -t leave-management-system:<sha> .`
2. Back up the database according to the provider's retention policy.
3. Run `npm run db:migrate:deploy` once as a release job, using `DIRECT_URL`.
4. Deploy the image with the three runtime variables above.
5. Confirm `GET /api/health` returns `{"status":"ok"}` and perform a login and
   leave-request smoke test.

The container runs as an unprivileged user, exposes port 3000, and includes a
health check. The health route is a liveness check and deliberately does not
query the database or authentication provider; use deployment smoke tests for
dependency readiness.

## Operations and security

- Terminate TLS at the load balancer or hosting platform and redirect HTTP to
  HTTPS there.
- Never commit `.env` files. Store production secrets in the hosting platform's
  secret manager and rotate them on a regular schedule.
- Restrict the direct database URL to the migration job. The app should only get
  the pooled URL with the minimum required database privileges.
- Review Supabase Auth redirect URLs and email templates for the production
  domain before launch.
- Monitor 5xx responses, authentication failures, database saturation, and
  health-check failures. Server errors intentionally omit internal details from
  responses and are logged by the application.
- Roll back by redeploying the previous immutable image. Database migrations
  must be backward-compatible because Prisma does not automatically roll them
  back.

CI is defined in `.github/workflows/ci.yml` and runs the same verification gate
on pushes to `main` and on pull requests.
