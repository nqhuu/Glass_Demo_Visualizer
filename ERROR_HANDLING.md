# ERROR_HANDLING.md

## Purpose

Errors must help the owner understand what failed without exposing sensitive information.

## General rule

Risky operations must use try/catch or NestJS exception handling.

Examples:
- login
- file upload
- project creation
- image upload
- region save
- region duplicate
- overlap validation
- glass assignment
- export rendering
- database writes

## Error context

Errors should include safe context:
- module name
- function/action name
- safe ids such as projectId, imageId, regionId
- clear message

Example backend log context:

```ts
// VI: Ghi log lỗi với thông tin an toàn để dễ tìm đúng module bị lỗi.
logger.error({
  module: 'GlassRegionService',
  action: 'duplicateRegion',
  projectId,
  imageId,
  regionId,
  errorCode: 'REGION_OVERLAP'
});
```

## User-facing message

Messages should be clear:
- "This region overlaps another region. Please adjust it before saving."
- "Upload failed because the file type is not supported."
- "You do not have permission to access this project."

## Never expose

Do not expose:
- JWT tokens
- passwords
- password hashes
- DB credentials
- absolute server paths
- raw SQL errors
- stack traces in production

## Frontend error display

Frontend should show:
- short user-friendly message
- optional error code
- retry action where appropriate

Frontend should not dump raw backend error objects into the UI.

## Development debugging

In development, console logs can be more detailed, but still must not include passwords, tokens, or secrets.
