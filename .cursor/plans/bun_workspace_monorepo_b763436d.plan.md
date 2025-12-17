---
name: Bun workspace monorepo
overview: Convert the repo to a Bun workspaces monorepo under `packages/`, add a shared `packages/api` workspace for exported types, and update Dockerfiles/docker-compose to build via root workspace installs and `bun --filter` builds.
todos:
  - id: move-to-packages
    content: Move `client/` and `server/` into `packages/` and update internal paths.
    status: pending
  - id: root-workspaces
    content: Add root `package.json` with Bun `workspaces` + filtered scripts; ensure a single root `bun.lock`.
    status: pending
  - id: add-api-workspace
    content: Create `packages/api` and re-export `AppType`; set workspace:* deps.
    status: pending
  - id: server-declarations
    content: Add TypeScript declaration emit for server (`build:types`) and ensure types are available to `@oncall/api`.
    status: pending
  - id: client-imports
    content: Switch client to import `AppType` from `@oncall/api` instead of relative server paths.
    status: pending
  - id: docker-workspace-build
    content: Update Dockerfiles and `docker-compose.yml` to build from root via `bun install` and `bun --filter` builds.
    status: pending
  - id: verify
    content: Verify local + Docker Compose builds succeed and runtime routing works.
    status: pending
---

# Bun workspaces monorepo plan

## Goal

Make `client` and `server` first-class Bun workspaces (per Bun docs) and introduce `packages/api` as the only place the client imports `AppType`, so Docker builds don’t rely on deep relative imports like `../../../server/src/index`.

Reference: Bun workspaces docs: [https://bun.com/docs/pm/workspaces](https://bun.com/docs/pm/workspaces)

## Target end state (structure)

```
<repo-root>
  package.json          # declares workspaces
  bun.lock              # single lockfile at root
  packages/
    client/
    server/
    api/
  docker-compose.yml
```

## Key design choices

- **Workspaces**: use root `package.json` with `"workspaces": ["packages/*"]` (per Bun docs).
- **Shared types**: client imports `AppType` from `packages/api` (never from server source paths).
- **Types availability**: server emits TypeScript declarations, and `api` re-exports `AppType` from the server package’s types.

## Implementation steps

### 1) Move existing projects into `packages/`

- Move `client/` → `packages/client/`
- Move `server/` → `packages/server/`
- Update any path references (Vite config, TS configs, Dockerfile paths, compose paths).

### 2) Add root workspace configuration

Create root `package.json` that:

- Declares workspaces: `"workspaces": ["packages/*"]` (Bun docs).
- Adds root scripts using Bun filters (Bun docs `--filter`):
  - `dev:client`, `dev:server`
  - `build` (build server types first, then client)
  - `lint` (client lint)

### 3) Normalize package names and workspace dependencies

Update `packages/*/package.json`:

- Give each a workspace name, e.g.
  - `packages/server`: `"name": "@oncall/server"`
  - `packages/client`: `"name": "@oncall/client"`
  - `packages/api`: `"name": "@oncall/api"`
- In `packages/api/package.json`, depend on server using Bun’s workspace protocol:
  - `"dependencies": { "@oncall/server": "workspace:*" }` (Bun docs).
- In `packages/client/package.json`, depend on api:
  - `"dependencies": { "@oncall/api": "workspace:*" }`

### 4) Create `packages/api` as the type boundary

Add `packages/api/src/index.ts` that re-exports the type only:

- `export type { AppType } from "@oncall/server";`

Then configure `packages/api/package.json` exports/types so TypeScript can resolve it cleanly.

### 5) Make the server produce type declarations

Right now server has no TS build step; it runs Bun directly. Add a server build script that emits `.d.ts`:

- Ensure TypeScript is available (likely as a root devDependency, hoisted by the workspace).
- Update `packages/server/tsconfig.json` (or add one) to support declarations:
  - `declaration: true`, `emitDeclarationOnly: true`, `outDir: dist/types` (or similar)
- Add `packages/server/package.json` script:
  - `build:types`: run `tsc` to emit declarations.

This ensures that when the client builds in Docker, it can typecheck against stable declarations, not raw server source.

### 6) Update the client to import from `@oncall/api`

Change `packages/client/src/lib/api.ts`:

- From: `import type { AppType } from '../../../server/src/index'`
- To: `import type { AppType } from '@oncall/api'`

(That’s the critical “stop reaching across package boundaries” fix.)

### 7) Update Dockerfiles to build from the workspace root

With workspaces, the Docker best practice is:

- **Build context**: repo root (so Docker can see root `package.json` + `bun.lock` + all workspaces).
- **Install once**: `bun install` at root.
- **Build with filters**:
  - `bun --filter @oncall/server run build:types`
  - `bun --filter @oncall/client run build`

Update:

- `docker-compose.yml` build contexts/dockerfile paths (now under `packages/`).
- `packages/client/Dockerfile` to copy the root workspace files and run filtered build.
- `packages/server/Dockerfile` similarly.

### 8) Verify the build graph

- Local: `bun install` at repo root; run filtered scripts.
- Docker: `docker compose build` should succeed without copying server sources into the client image just for typechecking.

## Files you’ll change/create

- `package.json` (new at repo root)
- `packages/client/**` (moved + import update)
- `packages/server/**` (moved + add type build output)
- `packages/api/package.json`, `packages/api/src/index.ts` (new)
- `docker-compose.yml` (update paths)
- `packages/client/Dockerfile`, `packages/server/Dockerfile` (update for workspace install/build)

## Notes / pitfalls to avoid

- **Don’t rely on `depends_on` for build ordering** in compose; use workspace scripts to enforce build order.
- **Align shared dependency versions** (notably `zod`) to avoid type mismatches when declarations reference it.
- Keep `api` truly “types-only” to prevent bundling server runtime code into the client.