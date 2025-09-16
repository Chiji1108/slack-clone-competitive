# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `npm run dev` - Start both frontend and backend in parallel (Next.js frontend + Convex backend)
- `npm run dev:frontend` - Start only Next.js development server
- `npm run dev:backend` - Start only Convex backend development
- `npm run predev` - Setup script that runs Convex dev, setup script, and opens dashboard

### Build & Deploy
- `npm run build` - Build Next.js application for production
- `npm run start` - Start production build
- `npm run lint` - Run Next.js linting

### Code Quality
- Use Biome for formatting and linting (configured via `biome.jsonc` extending "ultracite")
- Run `npx @biomejs/biome format .` to format code
- Run `npx @biomejs/biome check .` to check for issues

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15.2.3 with React 19, TypeScript, Tailwind CSS 4
- **Backend**: Convex (full-stack backend with database, server functions, and real-time subscriptions)
- **Authentication**: Convex Auth with custom provider configuration
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Development Tools**: Biome (linting/formatting), npm-run-all for parallel scripts

### Key Directories
- `app/` - Next.js App Router pages and components
- `convex/` - Backend functions, schema, and configuration
- `components/` - Reusable React components
- `.cursor/rules/` - Development guidelines (Convex rules and Ultracite standards)

### Architecture Patterns

#### Convex Backend Structure
- **Schema** (`convex/schema.ts`): Database tables with authentication tables from Convex Auth
- **Functions** (`convex/myFunctions.ts`): Queries, mutations, and actions following Convex patterns
- **Authentication** (`convex/auth.config.ts`, `convex/auth.ts`): Custom auth provider configuration
- **HTTP Routes** (`convex/http.ts`): HTTP endpoints for external API integration

#### Frontend Structure
- **App Router**: Uses Next.js 13+ app directory structure
- **Layout**: Root layout with Convex providers and font configuration
- **Components**:
  - `ConvexClientProvider.tsx`: Client-side Convex React provider
  - Authentication pages in `app/signin/`
  - Server components in `app/server/`

#### Authentication Flow
- Uses `@convex-dev/auth` for authentication
- Server-side provider: `ConvexAuthNextjsServerProvider`
- Client-side provider: `ConvexAuthNextjsProvider`
- Custom domain configuration via `CONVEX_SITE_URL`

### Development Guidelines

#### Convex Function Patterns
- Use new function syntax with explicit args and returns validators
- Always include `args`, `returns`, and `handler` properties
- Use `getAuthUserId(ctx)` for authentication in functions
- Example structure from existing code:
```typescript
export const listNumbers = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    // Implementation
  },
});
```

#### TypeScript Configuration
- Uses strict TypeScript settings with `strictNullChecks`
- Path mapping with `@/*` pointing to project root
- Target ES2017 with bundler module resolution

#### Code Quality Standards
- Follow Ultracite rules (comprehensive linting/formatting standards)
- Enforce accessibility standards and React best practices
- Use Biome for consistent code formatting
- Never use `console.log` - Ultracite rules forbid it

### Environment Setup
- Run `npm install` after cloning
- The `setup.mjs` script handles Convex Auth environment variable setup
- Runs automatically during `npm run predev` workflow
- Creates `.env.local` with necessary configuration

### Key Files
- `middleware.ts` - Next.js middleware configuration
- `next.config.ts` - Next.js configuration (minimal setup)
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `tsconfig.json` - TypeScript compiler configuration