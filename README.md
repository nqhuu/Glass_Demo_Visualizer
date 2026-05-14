# README.md

## Glass Demo Visualizer

Internal web app for realistic glass placement demos.

## What this app does

The app lets internal staff create demo images by placing predefined glass samples into selected regions on project photos.

It will support:
- JWT login
- admin glass catalog
- company branding
- project management
- multiple images per project
- multiple non-overlapping glass regions per image
- grid panes inside a region
- realistic glass material preview
- export with watermark

## Important product rule

This is not a color overlay editor.

The app must simulate real glass placement into windows, balconies, railings, facades, doors, and aluminum-frame areas.

## Sprint 0 structure

```text
apps/
  web/      React + TypeScript + Vite + Tailwind + i18n
  api/      NestJS + TypeORM + MySQL + JWT-ready module structure
packages/
  shared/   Shared TypeScript types
docs/
  ui/       Future UI reference images
```

## Setup

Install dependencies:

```bash
npm install
```

Create local env files:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Start MySQL:

```bash
docker compose up -d mysql
```

Run the frontend:

```bash
npm run dev:web
```

Run the backend:

```bash
npm run dev:api
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3000/api/health`
- MySQL: `localhost:3306`

## Sprint 1 local authentication

The backend seeds one local admin when these API env values are present:

```text
SEED_ADMIN_NAME
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
```

Default local example values are listed in `apps/api/.env.example`. Change them before shared team use.

Auth endpoints added in Sprint 1:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/admin-example`

## Files Codex must read

Before coding, Codex must read:
- `AGENTS.md`
- `PLANS.md`
- `RENDERING_SPEC.md`
- `SECURITY.md`
- `ERROR_HANDLING.md`
- `UI_PROMPTS.md`
- `README.md`

## Implementation workflow

Work by sprint or small task only. Do not build the full app in one step.

Sprint 0 provides only the foundation. Authentication, projects, editor behavior, rendering, admin CRUD, and export are intentionally left for later sprints.

## UI image workflow

Generate UI images first using `UI_PROMPTS.md`, then place them under:

```text
docs/ui/
```

Use clear file names, for example:

```text
01-login-mobile.png
02-dashboard-mobile.png
03-project-detail-tablet.png
04-editor-mobile-region-flow.png
05-editor-desktop-glass-placement.png
06-admin-glass-product-form.png
```
