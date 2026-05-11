# SECURITY.md

## Purpose

Security is required from the beginning because the app handles user accounts, customer project images, company branding assets, and exported demo images.

## JWT security

Required:
- use strong JWT secret from environment variable
- never hard-code JWT secret
- verify token on protected APIs
- use role guard for admin APIs
- keep token lifetime reasonable
- implement `/auth/me`

Do not log JWT tokens.

## Password security

Required:
- hash passwords with bcrypt or argon2
- never store plain text passwords
- never return password hash from API
- never log password values

## Authorization

Required:
- admin APIs require admin role
- user APIs require login
- users can only access their own projects/images/regions/exports unless admin
- backend must check ownership, not only frontend

## Upload security

For uploaded images/logos/textures:
- allow only safe image MIME types
- validate file extension and MIME type
- enforce file size limit
- generate safe server file names
- do not trust original file name
- store outside executable code path
- avoid serving unvalidated uploads as executable content

## CORS

In production, restrict CORS to allowed frontend domains.

## Rate limiting

Apply rate limits to:
- login
- upload endpoints
- export endpoints

## Error safety

Do not expose:
- stack traces to end users in production
- internal absolute paths
- SQL details
- secrets
- tokens
- passwords

Use `ERROR_HANDLING.md` for safe error format.

## Watermark enforcement

Exported demo images must include watermark/copyright.

A plain unbranded export should not be the default MVP behavior.

## Production checklist

Before production/internal rollout:
- JWT secret configured
- database password configured
- CORS configured
- upload size limit enabled
- admin role guard tested
- ownership checks tested
- watermark export tested
- production error responses checked
