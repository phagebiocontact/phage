# AGENTS.md - Development Guidelines for Agentic Coding

This file provides guidance for agentic coding agents working in this TanStack Start + Convex molecular dynamics simulation platform.

## Build & Development Commands

```bash
# Development
bun dev              # Start dev server with hot reload (opens browser)
bun build            # Production build
bun preview          # Preview production build

# Testing
bun test             # Run all tests with vitest
bun test <path>      # Run single test file (e.g., bun test src/components/Button.test.tsx)

# Code Quality (uses Biome)
bun lint             # Run linter
bun format           # Format code
bun check            # Run both lint and format checks with --write --unsafe
bun knip             # Find unused dependencies and exports

# Convex Backend
npx convex dev       # Start Convex dev server (syncs schema/functions)
npx convex deploy    # Deploy to production
```

## Architecture Overview

This is a **TanStack Start** application with **Convex** as the backend, built for molecular dynamics simulations (Phage platform).

### Tech Stack
- **Frontend**: React 19 + TanStack Router + TanStack Query + Motion/Framer Motion
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

## Code Style Guidelines

### Formatting (Biome Configuration)
- **Indentation**: Tabs (not spaces)
- **Quotes**: Double quotes for strings
- **Import Organization**: Auto-organized with Biome (`"source.organizeImports": "on"`)
- **File Includes**: Only `src/**/*`, `.vscode/**/*`, `index.html`, `vite.config.ts`
- **Excludes**: `src/routeTree.gen.ts`, `src/styles.css`

### Import Patterns
```typescript
// External libraries first
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

// Internal imports with @/* alias
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
```

### Component Patterns
```typescript
// Functional components with proper TypeScript
"use client"; // Add for client components that use browser APIs

import { useState, useEffect } from "react";

interface ComponentProps {
  title: string;
  optional?: boolean;
}

export function ComponentName({ title, optional = false }: ComponentProps) {
  // Component logic
  return <div>{title}</div>;
}
```

### Route Patterns (TanStack Router)
```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/route-path")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Route content</div>;
}
```

## Convex Schema Guidelines

- Use `v.id("tableName")` for foreign key references
- System fields `_id` and `_creationTime` are auto-generated (don't add to schema)
- Define indexes explicitly with `.index("name", ["field"])`
- Use proper validators: `v.string()`, `v.number()`, `v.optional(v.string())`

### Schema Example
```typescript
export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    credits: v.number(),
  })
    .index("by_email", ["email"]),
  
  simulations: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed")
    ),
  })
    .index("by_user", ["userId"]),
});
```

## Error Handling Patterns

### Auth Errors
```typescript
try {
  const result = await authClient.signIn.email({ email, password });
  if (result.error) {
    throw new Error(result.error.message || "Sign in failed");
  }
  toast.success("Welcome back!");
} catch (error) {
  const message = error instanceof Error ? error.message : "Please check your credentials";
  toast.error("Sign in failed", { description: message });
  throw error;
}
```

### Component Error Boundaries
- Use React's built-in error boundaries for route-level error handling
- Implement proper loading states with Suspense for lazy-loaded components

## Testing Guidelines

### Test Structure
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### Running Tests
- Use `bun test` for all tests
- Use `bun test <path>` for single test file
- Tests use Vitest with React Testing Library

## shadcn/ui Components

### Adding Components
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Component Structure
```typescript
"use client";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(/* ... */);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButton> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
```

## Styling Guidelines

### Tailwind CSS v4
- Use CSS variables for theme colors (`hsl(var(--primary))`)
- Component variants use CVA (class-variance-authority)
- Responsive design with mobile-first approach

### Motion/Framer Motion
- Use `motion` components for animations
- Implement proper stagger animations for lists
- Add hover states and micro-interactions

## TypeScript Configuration

### Path Aliases
- `@/*` maps to `./src/*`
- Use absolute imports: `import { Button } from "@/components/ui/button"`

### Strict Mode
- All TypeScript strict checks enabled
- No unused locals/parameters
- Proper type definitions required

## Environment Variables

- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CONVEX_SITE_URL` - Convex HTTP actions URL (for auth)
- Use `import.meta.env.VITE_*` for access in components

## Security Guidelines

### Input Validation
- Use Convex validators for all function inputs
- Sanitize user inputs on both client and server
- Implement proper rate limiting

### Authentication
- All protected routes must check authentication
- Use `useAuth()` hook for auth state
- Implement proper session management

## Performance Guidelines

### Code Splitting
- Use `lazy()` for heavy components (like MolstarViewer)
- Implement proper Suspense boundaries
- Optimize bundle size with dynamic imports

### Convex Queries
- Use proper indexes for database queries
- Implement pagination for large datasets
- Cache frequently accessed data

## Naming Conventions

### Files
- Components: PascalCase (`Button.tsx`, `Header.tsx`)
- Utilities: camelCase (`utils.ts`, `auth-client.ts`)
- Routes: kebab-case (`contact.tsx`, `pricing.tsx`)

### Variables/Functions
- camelCase for variables and functions
- PascalCase for React components
- UPPER_SNAKE_CASE for constants

### CSS Classes
- Use Tailwind's utility classes
- Custom CSS variables with kebab-case
- Component-scoped styles when necessary