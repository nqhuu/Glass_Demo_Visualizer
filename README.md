# README.md

## Glass Demo Visualizer

Internal web app for realistic glass placement demos.

## What this app does

The app lets internal staff create demo images by placing predefined glass samples into selected regions on project photos.

The internal MVP includes:
- JWT login
- admin glass catalog
- required export watermark branding
- project management
- multiple images per project
- multiple non-overlapping glass regions per image
- grid panes inside a region
- realistic glass material preview
- export with watermark
- admin-only action audit history

## Important product rule

This is not a color overlay editor.

The app must simulate real glass placement into windows, balconies, railings, facades, doors, and aluminum-frame areas.

## Workspace structure

```text
apps/
  web/      React + TypeScript + Vite + Tailwind + i18n
  api/      NestJS + TypeORM + MySQL + JWT APIs
packages/
  shared/   Shared TypeScript types
docs/
  ui/       UI reference images
```

## Internal demo setup

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

Apply backend database migrations after pulling schema changes:

```bash
npm --workspace apps/api run migration:run
```

Run the frontend:

```bash
npm run dev:web
```

Run the backend:

```bash
npm run dev:api
```

When `NODE_ENV=development` and `SEED_DEMO_DATA_ENABLED=true`, backend startup runs the idempotent demo seed. It creates missing demo catalog records and the configured local demo user without duplicating existing email/code/slug values.

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

## Local demo accounts

Development startup seeds the configured local accounts from `apps/api/.env`:

```text
SEED_ADMIN_NAME
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
SEED_DEMO_DATA_ENABLED
SEED_DEMO_USER_NAME
SEED_DEMO_USER_EMAIL
SEED_DEMO_USER_PASSWORD
```

The default `.env.example` credentials for local testing are:

```text
Admin:       admin@example.local / change-this-local-admin-password
Demo user:   consultant@example.local / change-this-local-demo-password
```

These accounts exist only when the development seed configuration is enabled. Change passwords before shared team use and never reuse them in deployment.

Relevant auth endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/admin-example`

## Demo glass catalog

With `SEED_DEMO_DATA_ENABLED=true`, startup also creates active, procedural demo glass samples if their unique codes do not already exist. It does not publish project photos or require public texture files.

Admin catalog lifecycle separates active, inactive, and archived items. Active products are available to the editor, inactive products are temporarily disabled, and archived products/categories stay restorable for admin without breaking existing region/export history.

Admin catalog endpoints:

- `GET /api/admin/glass-categories`
- `POST /api/admin/glass-categories`
- `PATCH /api/admin/glass-categories/:id`
- `DELETE /api/admin/glass-categories/:id`
- `GET /api/admin/glass-products`
- `POST /api/admin/glass-products`
- `PATCH /api/admin/glass-products/:id`
- `DELETE /api/admin/glass-products/:id`
- `GET /api/admin/glass-material-types`
- `POST /api/admin/glass-material-types`
- `PATCH /api/admin/glass-material-types/:id`
- `DELETE /api/admin/glass-material-types/:id`
- `GET /api/admin/glass-render-presets`
- `POST /api/admin/glass-render-presets`
- `PATCH /api/admin/glass-render-presets/:id`
- `DELETE /api/admin/glass-render-presets/:id`
- `GET /api/admin/audit-logs?limit=50`

Active catalog endpoints used by the editor:

- `GET /api/glass-categories`
- `GET /api/glass-products`
- `GET /api/glass-material-types`
- `GET /api/glass-render-presets`

Render presets are selected primarily per glass region in the editor. Existing products/regions without managed material type or region render preset ids continue to fall back to their legacy material enum and product render values.

## Local media security

- Uploaded project photos are loaded through the JWT-protected `GET /api/projects/:projectId/images/:imageId/file` endpoint, not a public uploads directory.
- Local material preview/texture assets may be placed in `UPLOAD_ROOT/catalog` and referenced as `/catalog-assets/<safe-file-name>` or legacy `/uploads/catalog/<safe-file-name>`. Only flat safe JPG, JPEG, PNG, or WEBP filenames are accepted; external asset URLs must use `http://` or `https://`. The API exposes catalog textures through `GET /api/catalog-assets/:fileName`.
- The MVP still stores files on the local filesystem; private object storage is a future deployment improvement.

## Demo workflow

1. Sign in as the demo user or admin.
2. Open **Projects**, create a consultation project, and upload a JPG, PNG, or WEBP project photo.
3. Open the uploaded image in the editor; protected project media is fetched with the authenticated API flow.
4. Draw one or more non-overlapping regions, set rows and columns, and save the generated panes.
5. Assign active predefined glass products, optionally choose a region render preset/context, and check the restrained material preview.
6. Select **Export demo**; every export includes the required watermark.
7. Return to project detail to view and download export history.
8. Sign in as admin to manage catalog products, material types, render presets, and optional safe preview/texture URLs.
9. As admin, open **Audit history** to review safe action records for the demo flow.

## Audit history

- Sprint 13 records key authentication, project/image, region/glass, export, and admin catalog actions.
- Audit records contain actor id/role, entity ids, status, timestamp and a generic safe message only.
- Passwords, tokens, reset values, request bodies, material payloads, storage keys and filesystem paths are never audit payloads.
- Audit recording is best-effort: a failed audit write is sanitized in server logs and does not undo the user action.

Use [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md) when validating a release candidate.

## Troubleshooting

- Database schema error after pulling changes: run `npm --workspace apps/api run migration:run` and restart the API.
- Local admin or demo user missing: confirm `NODE_ENV=development`, required seed values, and `SEED_DEMO_DATA_ENABLED=true` for the demo user/catalog, then restart the API.
- Project image does not preview: ensure the API is running and the session is valid; project images are not publicly served from `/uploads/projects`.
- Catalog texture is rejected: use a safe `http(s)` URL or a local flat JPG/PNG/WEBP asset such as `/catalog-assets/sample.png`.
- Export fails: assign an active glass product to at least one saved region before exporting.

## Files Codex must read

Before coding, Codex must read:
- `AGENTS.md`
- `PLANS.md`
- `RENDERING_SPEC.md`
- `SECURITY.md`
- `ERROR_HANDLING.md`
- `UI_PROMPTS.md`
- `README.md`

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
