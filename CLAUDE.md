# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify app built with React Router (v7), originally forked from the Shopify Remix template. The app uses Prisma with SQLite for session storage and is designed to be embedded within the Shopify admin.

**Tech Stack:**
- Framework: React Router v7
- UI: Polaris web components (using `<s-*>` custom elements)
- API: Shopify Admin GraphQL API
- Database: Prisma with SQLite (default)
- Session Storage: Prisma-based session storage
- TypeScript: Strict mode enabled
- Deployment: Fly.io with Litestream for SQLite replication

## Development Commands

```bash
# Start local development with Shopify CLI (primary dev command)
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Type checking
npm run typecheck

# Linting
npm run lint

# Database operations
npm run setup              # Generate Prisma client and run migrations
npx prisma migrate dev     # Create and apply new migration
npx prisma studio          # Open Prisma Studio GUI

# GraphQL code generation
npm run graphql-codegen

# Shopify CLI commands
npm run generate           # Generate extensions/webhooks
npm run deploy             # Deploy to Shopify
npm run config:link        # Link to Shopify app
npm run config:use         # Switch app configuration
npm run env                # Manage environment variables
```

## Architecture

### File Structure

- `app/` - Main application code
  - `shopify.server.ts` - Shopify app configuration and authentication exports
  - `db.server.ts` - Prisma client singleton
  - `routes/` - React Router file-based routes
    - `app.*.tsx` - Authenticated app routes (require Shopify admin session)
    - `auth.*.tsx` - OAuth authentication routes
    - `webhooks.*.tsx` - Webhook handler routes
  - `entry.server.tsx` - Server entry point
  - `root.tsx` - Root layout component
- `prisma/` - Database schema and migrations
- `extensions/` - Shopify app extensions (currently empty, ready for UI extensions, theme extensions, etc.)
- `public/` - Static assets

### Authentication Flow

All authenticated routes use `authenticate.admin(request)` from `app/shopify.server.ts`. The Shopify app package handles:
- OAuth flow via `/auth/*` routes
- Session management via Prisma
- API client initialization
- App Bridge integration

### Route Patterns

- **App routes** (`app.*.tsx`): Require authentication, embedded in Shopify admin
- **Auth routes** (`auth.*.tsx`): Handle OAuth and login flow
- **Webhook routes** (`webhooks.*.tsx`): Handle Shopify webhook events

### GraphQL Usage

Always use the authenticated `admin` GraphQL client:

```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    mutation {
      # your mutation
    }
  `);

  return await response.json();
};
```

### UI Components

This app uses **Polaris web components** (not React components). Elements are prefixed with `s-`:
- `<s-page>`, `<s-section>`, `<s-button>`, `<s-link>`, etc.
- See [Polaris web components docs](https://shopify.dev/docs/api/app-home/using-polaris-components)

### Navigation in Embedded Apps

Must use App Bridge-compatible navigation:
- Use `<s-link>` or React Router's `<Link>` (not `<a>` tags)
- Use `redirect` from `authenticate.admin()` (not React Router's `redirect`)
- Use `useSubmit()` from React Router for form submissions

### Webhooks

Webhooks are defined in `shopify.app.toml` under `[[webhooks.subscriptions]]`. The app automatically syncs these on deployment. Shop-specific webhooks can be registered in the `afterAuth` hook but app-specific webhooks in the TOML file are preferred.

Current webhooks:
- `app/uninstalled` → `/webhooks/app/uninstalled`
- `app/scopes_update` → `/webhooks/app/scopes_update`

## TypeScript

- Strict mode enabled
- Always run `npm run typecheck` after making changes to `.ts` or `.tsx` files
- Types are generated in `.react-router/types/` directory
- Run type generation: `npm run typecheck` (includes `react-router typegen`)

## Database

- Uses Prisma with SQLite by default (`prisma/dev.sqlite`)
- Session model handles Shopify OAuth sessions
- For production with multiple instances, use PostgreSQL/MySQL (see README)
- Always run `npx prisma generate` after schema changes
- Always create migrations: `npx prisma migrate dev --name <migration_name>`

## Shopify Dev MCP

This project is configured to use the Shopify Dev MCP server (`.mcp.json`) for enhanced development assistance with:
- Polaris components (`POLARIS_UNIFIED=true`)
- Liquid templates (`LIQUID=true`)

## Environment Variables

Required environment variables (managed by Shopify CLI during dev):
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `SCOPES`

Production also requires:
- `NODE_ENV=production`
- Database URL (if not using SQLite)

## API Version

Current API version: `ApiVersion.October25` (defined in `app/shopify.server.ts`)

## Scopes

Current access scopes: `write_products` (defined in `shopify.app.toml`)

## Important Notes

- Use `console.log` for debugging (not logger)
- Always check TypeScript errors after changes
- Use `image_url` filter (not deprecated `img_url`) in Liquid templates
- Prefer mobile-first approach in CSS
- The `shopify` global is available in client-side code via App Bridge
