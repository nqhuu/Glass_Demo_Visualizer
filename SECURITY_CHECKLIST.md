# Security Checklist - Sprint 11

## Completed

- JWT signing and verification use `JWT_SECRET` from environment configuration only.
- JWT payload is limited to user id (`sub`) and role; `/auth/me` returns public user data separately.
- Admin catalog APIs use JWT plus admin role guard; frontend admin navigation/routes remain role-gated.
- Project, image metadata, region, glass assignment, export metadata, and export download service paths verify project ownership and nested relationships.
- Password hashes and reset token hashes remain hidden from normal entity reads and API responses.
- Public registration creates the `user` role only; forgot-password responses remain generic.
- Project upload validates size, extension, MIME and JPG/PNG/WEBP signature, generates random server filenames, and rejects SVG/arbitrary files.
- Uploaded project images are delivered only through the JWT-protected project/image file endpoint with ownership checks; the UI loads them as authorized blobs.
- Public catalog material preview/textures accept only HTTP(S) URLs or flat safe `/catalog-assets/<file>` and legacy `/uploads/catalog/<file>` paths; the restricted endpoint serves validated JPG/PNG/WEBP files and `/uploads/projects` is not public.
- Export remains server-controlled, watermarked, protected by ownership checks, escapes SVG copyright text, and does not return internal `storageKey`.
- Login, project image upload, and export POST endpoints have MVP in-memory rate limiting through `@nestjs/throttler`.
- Production startup rejects missing or wildcard `CORS_ORIGIN`, missing database passwords, schema synchronization, and weak/placeholder JWT secrets.
- Backend and frontend failure logging has been sanitized to avoid raw errors, payloads, query strings, tokens, hashes and filesystem paths.

## Configuration

- Set a strong `JWT_SECRET` and database password outside source control.
- Set explicit `CORS_ORIGIN` in production; multiple trusted origins may be comma-separated.
- Configure `RATE_LIMIT_TTL_MS` and `RATE_LIMIT_MAX_REQUESTS` for expected internal traffic.
- Local admin seeding runs only when `NODE_ENV=development`.

## Known Limitations

- Rate limit storage is in-memory for the MVP; multi-instance deployment requires shared storage.
- Project images still use local filesystem storage for the MVP; production deployment should later migrate storage to private object storage without changing protected ownership rules.
- Public catalog textures remain local static-style assets for the MVP; object storage/CDN separation should preserve the catalog-only allowlist.
- SMTP/password reset delivery remains pending; reset responses do not expose tokens.
