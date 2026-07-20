# AI RULES

## Stack

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL (Supabase)

## General

- Use async/await.
- Never use "any".
- Use named exports.
- Server Components by default.
- Client Components only when necessary.

## Database

- Always use Prisma.
- Never write raw SQL unless requested.
- All queries go through services.

## API

- Validate requests.
- Return proper HTTP status codes.
- Handle errors.

## Components

- Small reusable components.
- No duplicated UI.

## Naming

- camelCase variables.
- PascalCase components.
- kebab-case folders.

## Security

- Never expose secrets.
- Validate user input.
- Check permissions before database writes.