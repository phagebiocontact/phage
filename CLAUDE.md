# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
bun dev              # Start dev server with hot reload (opens browser)
bun build            # Production build

# Testing
bun test             # Run tests with vitest

# Code Quality (uses Biome)
bun lint             # Run linter
bun format           # Format code
bun check            # Run both lint and format checks

# Convex Backend
npx convex dev       # Start Convex dev server (syncs schema/functions)
npx convex deploy    # Deploy to production
```

## Architecture Overview

This is a **TanStack Start** application with **Convex** as the backend, built for molecular dynamics simulations (Phage platform).

### Tech Stack
- **Frontend**: React 19 + TanStack Router + TanStack Query
- **Backend**: Convex (serverless database + functions)
- **Auth**: Better Auth with Convex adapter (`@convex-dev/better-auth`)
- **Payments**: Dodo Payments integration
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Build**: Vite + React Compiler (babel-plugin-react-compiler)

### Key Directory Structure
- `src/routes/` - File-based routing (TanStack Router)
- `src/components/` - React components including shadcn/ui in `ui/`
- `src/lib/` - Core utilities: `convex.tsx` (provider), `auth.tsx` (auth context), `auth-client.ts`
- `convex/` - Backend functions and schema

### Provider Hierarchy (src/routes/__root.tsx)
```
ConvexProvider → AuthProvider → ThemeProvider → TooltipProvider
```

### Convex Schema Guidelines
- Use `v.id("tableName")` for foreign key references
- System fields `_id` and `_creationTime` are auto-generated (don't add to schema)
- Define indexes explicitly with `.index("name", ["field"])`
- See `.cursorrules` for complete schema patterns

### Adding shadcn/ui Components
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Code Style (Biome)
- Indent with tabs
- Double quotes for strings
- Organized imports enabled
- Excludes: `src/routeTree.gen.ts`, `src/styles.css`

### Environment Variables
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CONVEX_SITE_URL` - Convex HTTP actions URL (for auth)

### Path Aliases
- `@/*` maps to `./src/*`
