# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: Next.js 15 (App Router) + React 19 + Convex (DB + functions) + Convex Auth (Password provider) + Tailwind CSS v4
- Package manager: npm (package.json present; no pnpm/yarn lockfiles detected)

Common commands
- Install deps
  - npm install
- Develop (starts Next and Convex; runs one-time auth setup and opens the Convex dashboard)
  - npm run dev
    - predev: convex dev --until-success && convex dev --once --run-sh "node setup.mjs --once" && convex dashboard
    - dev: npm-run-all --parallel dev:frontend dev:backend
    - dev:frontend: next dev
    - dev:backend: convex dev
- Build (Next.js)
  - npm run build
- Start production server (Next.js)
  - npm run start
- Lint (ESLint via Next.js)
  - npm run lint
- Code quality (Ultracite + Biome)
  - npx ultracite check
  - npx ultracite fix
- Convex CLI (optional, direct use)
  - npx convex -h
  - npx convex dev
- Testing
  - No test runner is configured in this repo. If a test runner is added later, document exact commands here (including how to run a single test).

Environment configuration
- The dev workflow expects a .env.local file in the repo root. The predev step runs node setup.mjs (which invokes npx @convex-dev/auth) to help populate required variables. The script writes SETUP_SCRIPT_RAN=1 the first time it completes successfully.
- Key variables referenced in code:
  - NEXT_PUBLIC_CONVEX_URL: used by components/ConvexClientProvider.tsx to initialize ConvexReactClient. Required for client-side Convex hooks to work.
  - CONVEX_SITE_URL: used in convex/auth.config.ts for Convex Auth provider configuration. For local dev, this generally matches your Next.js dev URL (e.g., http://localhost:3000).
- Running npm run dev will start convex dev, generate convex/_generated/*, run the auth setup script once, and open the Convex dashboard.

High-level architecture and data flow
- Next.js (app directory)
  - app/layout.tsx
    - Wraps the HTML with ConvexAuthNextjsServerProvider (server-side) and provides ConvexClientProvider (client-side). Loads Geist fonts and global styles.
  - components/ConvexClientProvider.tsx
    - "use client"; creates a single ConvexReactClient with process.env.NEXT_PUBLIC_CONVEX_URL and wraps children in ConvexAuthNextjsProvider.
  - app/page.tsx (client component)
    - Demonstrates authenticated UI with useConvexAuth and useAuthActions (Sign out); reads and writes data using useQuery(api.myFunctions.listNumbers) and useMutation(api.myFunctions.addNumber).
  - app/server/page.tsx and app/server/inner.tsx
    - Server route preloads data with preloadQuery(api.myFunctions.listNumbers, { count: 3 }) and hydrates/reacts on the client via usePreloadedQuery in the inner client component.
  - app/signin/page.tsx (client component)
    - Password flow using useAuthActions(). Form posts via FormData to signIn("password", formData), toggling between sign-in and sign-up.
- Convex backend (convex directory)
  - convex/schema.ts
    - Extends authTables from @convex-dev/auth/server; defines a numbers table: { value: v.number() }.
  - convex/myFunctions.ts
    - listNumbers (query): returns { viewer, numbers } using ctx.db.query("numbers") ordered by _creationTime; resolves viewer via getAuthUserId and reads user email when present.
    - addNumber (mutation): inserts into numbers.
    - myAction (action): example of calling queries/mutations via ctx.runQuery/ctx.runMutation. Note: actions cannot access ctx.db directly; use ctx.runQuery/ctx.runMutation.
  - convex/auth.ts
    - Configures convexAuth with Password provider and exports { auth, signIn, signOut, store, isAuthenticated }.
  - convex/auth.config.ts
    - Provider domain is read from CONVEX_SITE_URL.
  - convex/http.ts
    - Registers HTTP routes for Convex Auth via auth.addHttpRoutes(http); exports http router.
- Styling and build tooling
  - Tailwind v4 via @import "tailwindcss" in app/globals.css with CSS custom properties and @theme inline for color/font variables.
  - postcss.config.mjs configures the @tailwindcss/postcss plugin.
- TypeScript & configuration
  - tsconfig.json (root): strict true; moduleResolution "bundler"; paths alias @/* -> ./*; React JSX preserve (Next).
  - convex/tsconfig.json: Convex runtime typing (noEmit, ESNext, JSX react-jsx, etc.).
  - next.config.ts: minimal NextConfig scaffold.

Data flow summary
- Auth: Client uses useAuthActions from @convex-dev/auth/react for sign-in/out. Server provider in app/layout ensures auth context is available for the App Router. Auth HTTP routes are exposed through convex/http.ts.
- Read: Client components call useQuery(api.myFunctions.listNumbers) to get { viewer, numbers } reactively.
- Write: Client components use useMutation(api.myFunctions.addNumber) to insert numbers; server route demonstrates preload + hydrate pattern.

Local rules and conventions (from .cursor/rules and project setup)
- Convex function design
  - Use the new function syntax with explicit args and return validators (use v.null() when appropriate).
  - Public: query, mutation, action. Internal/private: internalQuery, internalMutation, internalAction. Reference functions using the generated api/internal objects from convex/_generated/api.
  - Prefer indexed queries over filter; define indexes in convex/schema.ts and use withIndex/withSearchIndex where applicable.
  - Actions cannot access ctx.db; they may call other functions via ctx.runQuery/ctx.runMutation and should include "use node" when using Node APIs.
- HTTP endpoints
  - Define in convex/http.ts; Convex Auth routes are added via auth.addHttpRoutes(http).
- Code quality (Ultracite/Biome)
  - The repo includes ultracite and @biomejs/biome. You can format/lint with:
    - npx ultracite check
    - npx ultracite fix

Notes from README.md
- Quickstart: npm install && npm run dev
- Stack: Convex backend, React UI, Next.js routing/hosting, Tailwind styling, Convex Auth authentication
- See Convex and Convex Auth documentation for deeper configuration and additional auth providers.
