# Repository Guidelines

## Project Structure & Module Organization
Source lives under `app/` (Next.js App Router routes) and `components/` (shared React UI). Backend logic, database schema, and auth handlers sit in `convex/`; keep mutations/queries colocated with their `schema.ts`. Static assets and icons reside in `public/`. Key configuration is at the repo root (`next.config.ts`, `tsconfig.json`, `biome.jsonc`, `middleware.ts`), while `setup.mjs` supports one-time Convex Auth initialization.

## Build, Test, and Development Commands
Use `npm install` after cloning. `npm run dev` starts Next.js and Convex side by side; run `npm run dev:frontend` or `npm run dev:backend` when focusing on one surface. `node setup.mjs --once` refreshes local auth secrets if `.env.local` changes. Ship code via `npm run build` and verify production mode with `npm start`. Lint with `npm run lint` and address warnings before committing.

## Coding Style & Naming Conventions
Write TypeScript first; prefer explicit types on Convex functions and React props. Components use PascalCase (for example `components/Sidebar.tsx`), hooks stay camelCase (`useChannelList`). Maintain 2-space indentation and rely on Biome + Next ESLint rules (`biome.jsonc`) for formatting. Co-locate styles using Tailwind utility classes; avoid ad-hoc CSS files.

## Testing Guidelines
Automated tests are not wired up yet, so document manual verification steps in your PR. When adding tests, follow a `*.test.ts` or `*.spec.ts` pattern adjacent to the code and script them under a future `npm test`. Capture Convex data scenarios with seed scripts or temporary mutations gated behind development checks.

## Commit & Pull Request Guidelines
Commits follow short, imperative summaries (current history: `init`). Group related file changes and note schema or env updates in the body. Pull requests need a concise description, screenshots or screen recordings for UI updates, and a checklist of local verifications (dev server, lint). Link Convex dashboard changes or issue IDs where applicable, and flag breaking auth or environment changes early.

## Environment & Auth Notes
Store secrets in `.env.local`; never commit them. Running `convex dev --once --run-sh "node setup.mjs --once"` (executed by `npm run dev`) ensures Convex Auth variables exist. If backend schema changes, run `convex dev` before pushing so generated types stay current under `convex/_generated`.
