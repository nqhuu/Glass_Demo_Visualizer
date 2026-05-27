# Internal Demo Checklist

Use this checklist for a local or internal MVP demonstration.

## Setup

- Apply migrations with `npm --workspace apps/api run migration:run`.
- Confirm development seed variables are configured before starting the API.
- Sign in with a seeded demo account; do not use example passwords outside local testing.

## Main Flow

- Create or open a project.
- Upload a JPG, PNG, or WEBP building photo.
- Confirm the protected thumbnail loads after sign-in.
- Open the image editor and confirm the canvas loads.
- Draw non-overlapping glass regions and generate pane grids.
- Assign different active glass products where needed.
- Review the material preview; no user-facing tint or opacity controls should appear.
- Export the demo image and verify its watermark.
- Return to project detail and download the export from history.

## Access Checks

- As a normal user, confirm admin catalog navigation is unavailable.
- As an admin, confirm catalog products and approved media URLs can be managed.
- Confirm a direct project image file request without JWT is rejected.
- Confirm `/uploads/projects` is not a public media source.

## Responsive Smoke Test

- Phone: upload, editor region controls, glass assignment, and export actions remain reachable.
- Tablet: editor panel and canvas remain usable without overlapping controls.
- Desktop: project detail, editor side panels, and catalog forms are readable.

## Known MVP Limits

- Project photos and exports use local filesystem storage behind protected APIs.
- Catalog material assets may be public only through the restricted catalog asset route.
- Rate limiting is in-memory and intended for single-instance internal deployment.
