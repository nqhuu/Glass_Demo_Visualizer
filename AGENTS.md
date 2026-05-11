# AGENTS.md

## Purpose of this file

This file gives Codex the working rules for the Glass Demo Visualizer project. Codex must read this file before editing code.

Codex must also read:
- `PLANS.md`
- `RENDERING_SPEC.md`
- `SECURITY.md`
- `ERROR_HANDLING.md`
- `UI_PROMPTS.md`
- `README.md`

## Product summary

Glass Demo Visualizer is an internal web application for a glass and aluminum company.

The app helps staff create realistic demo images by placing predefined glass samples into selected glazing regions on photos of houses, balconies, doors, windows, facades, railings, and aluminum-frame areas.

The product is not a generic image editor and not a color filter app.

The core product goal is:

> Simulate real glass panels installed into selected glass openings or aluminum-frame areas, while preserving frames, railings, handles, fittings, borders, and the surrounding structure.

## Key product principles

1. The app must feel simple, professional, and fast for internal business use.
2. The editor must focus on glass placement, not freeform image painting.
3. Glass appearance is defined by admin in advance.
4. Normal users choose predefined glass samples; they do not freely adjust tint, opacity, hue, or transparency sliders.
5. A project can have many images.
6. One image can have many glass regions.
7. One glass region can contain many glass panes/cells.
8. One glass region uses one glass product at a time.
9. Different regions on the same image may use different glass products.
10. Glass regions on the same image must not overlap.
11. Exported demo images must include company watermark/copyright.

## Tech stack

Use technologies the owner already understands:

### Frontend
- React
- TypeScript
- Vite recommended for simplicity
- Tailwind CSS
- React Router
- Zustand or React Context for state where appropriate
- i18n support with Vietnamese and English from the beginning

### Backend
- NestJS
- TypeScript
- TypeORM
- MySQL
- JWT authentication from the beginning

### Infrastructure
- Docker Compose for local MySQL
- Local file storage for MVP, designed so it can be upgraded to S3/R2 later
- Environment variables for secrets and paths

## Authentication requirement

JWT must be implemented from the beginning.

Required:
- email/password login
- password hashing using bcrypt or argon2
- access token issued by backend
- protected frontend routes
- protected API routes
- role guard for admin/user
- `/auth/me` endpoint

Do not postpone authentication to later sprints.

## Responsive requirement

The app must be mobile/tablet-first but still work well on laptop and PC.

Responsive priority:
1. Mobile phone
2. Tablet
3. Laptop
4. Desktop/PC

Editor layout may be richer on larger screens, but all major actions must remain usable on phone/tablet.

Use:
- mobile bottom navigation or compact top actions
- bottom sheets for glass selection and region actions
- touch-friendly buttons
- cards instead of dense tables on mobile
- collapsible panels on tablet
- full side panels on laptop/desktop

## Branding requirement

Admin must be able to configure branding:
- company logo
- login logo
- header logo
- watermark logo
- primary brand color
- secondary brand color
- accent color
- copyright text

The default brand direction is red and black, but the UI must remain clean and professional.

Use red as a controlled accent, not as a heavy background everywhere.

## Data relationship

The current product architecture must use this relationship:

```text
Project
  -> ProjectImage[]
      -> GlassRegion[]
          -> GlassRegionPane[]
```

Important:
- Do not use the older simplified `project_areas` model unless explicitly requested.
- Use `glass_regions` for selected installation zones.
- Use `glass_region_panes` for generated panes/cells inside each region.

## Glass region rules

A glass region represents one installation zone on one project image.

A region can be:
- rectangle
- quadrilateral
- polygon
- grid-based region

Each region:
- belongs to one project image
- has one boundary
- can contain multiple panes/cells
- can have one assigned glass product
- can be unassigned
- can be edited, copied, deleted
- must not overlap another region on the same image

Allowed region actions:
- create region
- confirm region
- rename region
- move region
- resize region
- reshape by dragging corners/edges
- convert rectangle to quadrilateral/polygon when needed
- split into rows/columns
- regenerate grid panes
- duplicate/copy region
- delete region
- assign glass product
- change assigned glass product
- remove assigned glass product

## Geometry editing requirement

The editor must support flexible geometry adjustment.

User flow example:
1. Draw a rectangle quickly on the image.
2. Drag corners and edges to match the real object.
3. Convert to quadrilateral/polygon if the real shape is angled or folded.
4. Adjust the selected region to follow balcony glass, railing glass, window frames, curtain walls, or aluminum-frame openings.
5. Split region into panes/cells if needed.
6. Assign a predefined glass sample.

For folded balconies or angled railings, the user should create multiple adjacent regions or polygon/quadrilateral regions that follow the real perspective.

## Non-overlap rule

Glass regions on the same image must not overlap.

- Adjacent regions are allowed.
- Regions may touch edges.
- Regions may be close together.
- Overlapping regions are not allowed.

Validation must happen:
- when creating a region
- when editing a region
- when moving/resizing a region
- when duplicating a region
- before saving to backend
- again on backend before accepting the change

## Rendering principle

The app must not render glass as a flat color overlay/filter.

The app must simulate placing a real glass material into the selected glass region.

Rendering must preserve:
- aluminum frames
- railings
- fittings
- posts
- handles
- mullions
- borders
- surrounding structure

The render should use predefined glass material profiles from admin.

Normal users must not freely control tint/opacity/color sliders in the editor.

## Code comments requirement

Every source file created by Codex must include concise Vietnamese comments.

Comments must explain:
- what the file/module/component/service does
- important business logic
- non-obvious geometry/rendering logic
- security-related code
- error handling logic

Do not over-comment simple lines. Use short, useful Vietnamese comments.

Examples:

```ts
// VI: Component hiển thị danh sách vùng kính của ảnh đang chọn.
// VI: Kiểm tra vùng mới có chồng lên vùng cũ hay không trước khi lưu.
// VI: Guard xác thực JWT cho các API cần đăng nhập.
```

## Error handling requirement

Risky operations must use try/catch or framework-level exception handling.

Errors must include enough safe context to help the owner debug:
- module name
- function/action name
- related project/image/region id if safe
- clear human-readable message

Do not expose:
- passwords
- tokens
- JWT secrets
- internal absolute file paths
- database credentials

See `ERROR_HANDLING.md` for details.

## i18n rule

Frontend visible text must use i18n keys.

Required languages:
- Vietnamese
- English

Vietnamese can be the primary business language, but the code architecture must support adding more languages later.

## Security rule

Security requirements are not optional.

Codex must follow `SECURITY.md` for:
- JWT security
- password hashing
- upload validation
- role guards
- ownership checks
- rate limiting
- CORS
- environment secrets
- watermark enforcement

## Scope control

Codex must not build the whole application in one step.

Work by sprint or by small task:
- read docs
- summarize understanding
- implement one sprint/task only
- run lint/typecheck/build where possible
- report what changed
- report failures honestly

## Things not to build in MVP

Do not build these unless specifically requested:
- public SaaS billing
- marketplace
- complex CRM
- SSO/OAuth
- advanced AI automatic detection
- full 3D rendering
- Photoshop-like image editor
- freeform color painting tools
- uncontrolled opacity/tint sliders for normal users
