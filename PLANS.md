# PLANS.md

## 1. Project name

Glass Demo Visualizer - Realistic Glass Placement MVP

## 2. Product vision

Build an internal web application for a glass/aluminum company to quickly create realistic demo images of glass installation on houses and buildings.

The app must allow staff to:
- create a project
- upload or select building images
- create glass regions on each image
- adjust region geometry to match real windows, railings, balconies, facades, doors, and aluminum frames
- split a region into multiple panes/cells
- assign predefined glass samples to each region
- preview glass as realistic installed material
- export demo images with company watermark

This is an internal business tool first, not a public SaaS product.

## 3. MVP goal

The MVP is successful when internal staff can create convincing demo images for customer consultation.

The result should look like glass panels installed into the building photo, not like a transparent color layer placed on top of the image.

## 4. Core product statement

> In one project, users can manage multiple images. In each image, users can create multiple non-overlapping glass regions. Each region can contain multiple panes and uses one predefined glass sample. Users can adjust the region geometry to match real installation areas and export a realistic demo image with watermark.

## 5. Target users

### Internal user
- sales staff
- showroom staff
- technical consultants
- project consultants

### Admin
- manages glass catalog
- manages glass categories
- manages building templates
- configures branding/logo/watermark
- configures default rendering profiles

## 6. What the app is

The app is:
- a glass placement visualizer
- a realistic demo tool
- a material assignment workflow
- a controlled business tool

## 7. What the app is not

The app is not:
- a Photoshop clone
- a freeform image coloring app
- a generic filter app
- a tool where users freely drag tint/opacity/hue sliders for final output
- a 3D rendering engine in the MVP

## 8. Tech stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand or Context API
- i18n for Vietnamese and English

### Backend
- NestJS
- TypeScript
- TypeORM
- MySQL
- JWT authentication

### Local development
- Docker Compose for MySQL
- `.env.example` files for frontend/backend
- local file uploads for MVP

### Future upgrade path
- object storage such as S3/R2
- worker queue for heavier exports
- AI-assisted region detection
- advanced rendering presets

## 9. Responsive priority

The UI must be designed mobile/tablet-first.

Priority:
1. Mobile
2. Tablet
3. Laptop
4. Desktop/PC

### Mobile expectations
- compact dashboard
- card-based project list
- editor canvas fills most of the screen
- bottom toolbar
- bottom sheet for region actions
- bottom sheet for glass selection
- large touch targets

### Tablet expectations
- canvas centered
- collapsible side panels
- split view when enough width exists

### Laptop/desktop expectations
- full editor layout
- left tool panel
- center canvas
- right selected region panel
- bottom floating action bar

## 10. Branding direction

Default brand direction:
- red and black company identity
- clean white/light-gray background
- charcoal text
- red accent for important actions
- avoid heavy dark UI
- avoid excessive red blocks

Admin can configure:
- company logo
- login logo
- header logo
- watermark logo
- primary color
- secondary color
- accent color
- copyright text

## 11. Main modules

### 11.1 Auth module
Required from the beginning.

Features:
- email/password login
- JWT access token
- password hashing
- `/auth/me`
- protected routes
- admin/user role guards

### 11.2 User project module
Features:
- project list
- create project
- edit project
- delete project
- project detail
- customer/project notes
- project status

### 11.3 Project image module
A project can contain many images.

Features:
- add image by upload
- add image from building template
- edit image title/description
- reorder images
- delete image
- open image in editor
- export image demo

Example images inside one project:
- front facade
- balcony
- stair glass
- main door
- side elevation
- window section

### 11.4 Glass placement editor
This is the core module.

The editor works on one project image at a time.

Features:
- display selected project image
- create multiple glass regions
- edit region geometry
- split region into panes/cells
- assign glass product to region
- copy region
- delete region
- remove assigned glass from region
- validate non-overlap
- preview realistic glass placement
- save editor state
- export demo with watermark

### 11.5 Glass catalog admin
Features:
- glass categories CRUD
- glass products CRUD
- upload preview/texture image
- configure material appearance profile
- activate/deactivate products

### 11.6 Building template admin
Features:
- upload sample building images
- categorize templates
- activate/deactivate templates

### 11.7 Branding/settings admin
Features:
- configure logos
- configure red/black brand theme
- configure watermark logo/text
- configure default export settings

### 11.8 Export module
Features:
- export selected project image
- apply all glass regions and panes
- apply watermark/logo/copyright
- save export record
- allow download

## 12. Required screens

### User screens
1. Login
2. Dashboard
3. Project list
4. Create project
5. Project detail
6. Project image gallery
7. Add image / choose template
8. Glass placement editor
9. Export preview modal/screen
10. Export history for project

### Admin screens
1. Admin dashboard
2. Glass category list
3. Glass category form
4. Glass product list
5. Glass product form
6. Glass material appearance settings
7. Building template list
8. Building template upload form
9. Branding settings
10. Watermark settings
11. Basic app settings

## 13. Glass placement editor UX

### 13.1 Main idea

The editor must help users place real glass samples into building image regions.

Normal user focus:
- choose region geometry
- choose predefined glass sample
- preview result
- export

Normal users should not be asked to manually tune color/opacity for final output.

### 13.2 Main editor layout

Mobile:
- top compact project/image bar
- canvas area
- bottom action toolbar
- bottom sheet for selected region
- bottom sheet for glass library

Tablet:
- canvas area
- collapsible region list
- collapsible glass selector

Laptop/desktop:
- left toolbar
- center canvas
- right selected region panel
- bottom floating zoom/export bar

### 13.3 Editor tools

Required tools:
- Select/move
- Add rectangle region
- Add quadrilateral region
- Add polygon region
- Split grid by rows/columns
- Edit corners/edges
- Copy region
- Delete region
- Assign/change glass
- Remove glass from region
- Export demo

### 13.4 Region creation workflow

Fast workflow:
1. User clicks "Add region".
2. User draws a rectangle on the image.
3. User adjusts corners/edges to fit the real installation area.
4. If needed, user converts to quadrilateral or polygon.
5. User sets rows/columns or manually creates grid lines.
6. User selects one glass sample for the whole region.
7. User confirms creation.
8. The system creates region and panes.
9. User can add more regions elsewhere on the same image.

### 13.5 Real-world geometry examples

Balcony glass:
- create one region for front railing
- create another region for side railing if angled
- adjust corners to follow perspective
- split into panes according to posts

Window group:
- create one rectangular/quadrilateral region
- split into rows/columns
- assign glass

Curtain wall:
- create one large region
- split by grid
- assign glass

Folded or angled facade:
- create multiple adjacent regions
- each region follows one perspective plane
- regions may touch but not overlap

## 14. Region and pane model

### 14.1 Concept

A `glass_region` is the selected installation zone.

A `glass_region_pane` is one generated glass panel/cell inside that region.

A region can have one or many panes.

A region uses one glass product, and all panes inside that region inherit that glass product.

### 14.2 Rules

- One image has many regions.
- One region has many panes.
- One region can be assigned one glass product.
- A region may be unassigned.
- Different regions can use different glass products.
- Regions cannot overlap.
- Panes inside the same region can share boundaries.
- Panes are generated from the region grid or manual split lines.

### 14.3 Region lifecycle

1. Draft region is being created.
2. User confirms region geometry.
3. Region is saved.
4. User assigns glass.
5. User can change glass.
6. User can remove glass.
7. User can edit geometry/grid.
8. User can copy region.
9. User can delete region.

### 14.4 Region actions

Required:
- create
- rename
- move
- resize
- reshape
- edit corners
- edit edges
- change rows/columns
- regenerate panes
- duplicate
- delete
- assign glass
- change glass
- clear/remove glass

### 14.5 Copy behavior

When copying a region, the new region should keep:
- boundary shape
- rows/columns
- generated panes
- assigned glass product

The new region must:
- have a new id
- be offset slightly from the original
- not overlap existing regions

If no valid location is found, show an error and do not save the copy.

### 14.6 Delete behavior

Deleting a region deletes:
- the region
- its panes
- its assigned glass relationship

Deleting a region requires confirmation.

Removing glass from a region does not delete the region.

## 15. Non-overlap validation

### 15.1 Rule

Regions on the same image must not overlap.

Allowed:
- adjacent regions
- touching edges
- small gap between regions

Not allowed:
- one region covering another
- partial intersection
- copied region placed on top of original

### 15.2 Validation points

Validation must run:
- during draft preview if possible
- before confirm region
- before save region edit
- before duplicate save
- on backend API before database write

### 15.3 UX behavior

When invalid overlap occurs:
- show region border as error state
- display clear message: "Region overlaps another region"
- prevent save/confirm
- provide cancel or adjust actions

## 16. Realistic glass rendering requirements

Detailed rendering rules are in `RENDERING_SPEC.md`.

Summary:
- render glass as material placement, not flat overlay
- clip material to region panes
- preserve frames and structure as much as possible
- use admin-defined material profile
- support tint, reflectivity, transmission, shadow, texture/pattern
- avoid user-controlled final tint/opacity sliders
- export result with watermark

## 17. Glass catalog requirements

### 17.1 Glass category
Fields:
- name
- slug
- description
- active status
- sort order

### 17.2 Glass product
Fields:
- category
- name
- code
- description
- preview image
- texture image optional
- active status
- sort order

### 17.3 Glass material appearance profile
Fields:
- material type: clear / tinted / reflective / frosted / patterned
- base tint color
- tint strength
- transmission level
- reflectivity level
- shadow level
- texture intensity
- edge treatment
- realism preset

Admin configures these values. Normal users only choose products.

## 18. Database model plan

### users
- id
- name
- email
- password_hash
- role: admin/user
- status
- created_at
- updated_at

### projects
- id
- user_id
- name
- customer_name
- customer_phone
- notes
- status
- created_at
- updated_at

### project_images
- id
- project_id
- title
- description
- source_type: upload/template
- image_url
- original_file_name
- width
- height
- sort_order
- created_at
- updated_at

### glass_regions
- id
- project_id
- project_image_id
- name
- boundary_type: rectangle/quadrilateral/polygon
- boundary_points_json
- glass_product_id nullable
- grid_mode: none/rows_columns/manual_lines
- rows nullable
- columns nullable
- status: unassigned/assigned/invalid
- sort_order
- created_at
- updated_at

### glass_region_panes
- id
- glass_region_id
- pane_code
- pane_points_json
- row_index nullable
- column_index nullable
- sort_order
- created_at
- updated_at

### glass_categories
- id
- name
- slug
- description
- is_active
- sort_order
- created_at
- updated_at

### glass_products
- id
- category_id
- name
- code
- description
- preview_image_url
- texture_image_url nullable
- is_active
- sort_order
- created_at
- updated_at

### glass_appearance_configs
- id
- glass_product_id
- material_type
- base_tint_color
- tint_strength
- transmission_level
- reflectivity_level
- shadow_level
- texture_intensity
- edge_treatment
- realism_preset
- created_at
- updated_at

### building_templates
- id
- name
- category
- image_url
- is_active
- sort_order
- created_at
- updated_at

### app_branding_settings
- id
- company_name
- logo_url
- login_logo_url
- header_logo_url
- watermark_logo_url
- primary_color
- secondary_color
- accent_color
- copyright_text
- created_at
- updated_at

### export_files
- id
- project_id
- project_image_id
- file_url
- file_type
- watermark_applied
- exported_by_user_id
- created_at

### app_settings
- id
- setting_key
- setting_value_json
- updated_at

## 19. API plan

### Auth
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`

### Projects
- GET `/projects`
- POST `/projects`
- GET `/projects/:projectId`
- PATCH `/projects/:projectId`
- DELETE `/projects/:projectId`

### Project images
- GET `/projects/:projectId/images`
- POST `/projects/:projectId/images`
- GET `/projects/:projectId/images/:imageId`
- PATCH `/projects/:projectId/images/:imageId`
- DELETE `/projects/:projectId/images/:imageId`
- PATCH `/projects/:projectId/images/reorder`

### Glass regions
- GET `/projects/:projectId/images/:imageId/regions`
- POST `/projects/:projectId/images/:imageId/regions`
- GET `/projects/:projectId/images/:imageId/regions/:regionId`
- PATCH `/projects/:projectId/images/:imageId/regions/:regionId`
- DELETE `/projects/:projectId/images/:imageId/regions/:regionId`
- POST `/projects/:projectId/images/:imageId/regions/:regionId/duplicate`

### Glass assignment
- PATCH `/projects/:projectId/images/:imageId/regions/:regionId/glass`
- DELETE `/projects/:projectId/images/:imageId/regions/:regionId/glass`

### Export
- POST `/projects/:projectId/images/:imageId/export-demo`
- GET `/projects/:projectId/exports`
- GET `/projects/:projectId/exports/:exportId`

### Public user glass catalog
- GET `/glass-categories`
- GET `/glass-products`
- GET `/glass-products/:productId`

### Admin glass catalog
- GET `/admin/glass-categories`
- POST `/admin/glass-categories`
- PATCH `/admin/glass-categories/:id`
- DELETE `/admin/glass-categories/:id`
- GET `/admin/glass-products`
- POST `/admin/glass-products`
- PATCH `/admin/glass-products/:id`
- DELETE `/admin/glass-products/:id`
- PATCH `/admin/glass-products/:id/appearance`

### Admin templates
- GET `/admin/building-templates`
- POST `/admin/building-templates`
- PATCH `/admin/building-templates/:id`
- DELETE `/admin/building-templates/:id`

### Admin branding/settings
- GET `/admin/branding`
- PATCH `/admin/branding`
- POST `/admin/branding/logo`
- POST `/admin/branding/watermark-logo`
- GET `/admin/settings`
- PATCH `/admin/settings`

## 20. Security plan summary

Detailed rules are in `SECURITY.md`.

Mandatory:
- JWT auth from Sprint 1
- password hashing
- role guards
- ownership checks
- upload validation
- file size limits
- rate limiting for login/upload/export
- safe error messages
- no secret leakage
- CORS restriction
- watermark on export

## 21. Error handling plan summary

Detailed rules are in `ERROR_HANDLING.md`.

Every risky action must return a clear error with:
- module name
- action/function name
- safe ids where relevant
- user-friendly message
- developer-friendly log context

## 22. Vietnamese code comment rule

All source files must contain concise Vietnamese comments explaining what the file/module/component/service does.

Examples:
- API service files
- React components
- NestJS modules/controllers/services
- guards
- upload handlers
- geometry utilities
- rendering utilities
- error helpers

Do not create comment noise. Comments must help the owner understand the code quickly.

## 23. Sprint roadmap

### Sprint 0 - Project foundation
Goal:
- create monorepo/project structure
- setup frontend React/Vite/TypeScript/Tailwind
- setup backend NestJS/TypeORM/MySQL
- setup Docker Compose for MySQL
- setup env examples
- setup i18n foundation
- setup basic folder structure

Deliverables:
- frontend runs
- backend runs
- database connection works
- README setup instructions

### Sprint 1 - JWT authentication
Goal:
- implement login
- hash passwords
- issue JWT access token
- add auth guard
- add role guard
- add `/auth/me`
- protect frontend routes

Deliverables:
- admin/user login works
- protected routes work
- unauthorized access blocked

### Sprint 2 - Branding and responsive app shell
Goal:
- mobile/tablet-first layout
- red/black clean brand theme
- topbar/sidebar/bottom nav variants
- logo display placeholders
- route shell

Deliverables:
- app shell works on mobile/tablet/laptop/desktop
- all visible text uses i18n keys

### Sprint 3 - Admin glass catalog
Goal:
- glass categories CRUD
- glass products CRUD
- appearance config form
- preview/texture upload
- active/inactive status

Deliverables:
- admin can create usable glass products
- normal user can browse active glass products

### Sprint 4 - Admin templates and branding
Goal:
- building template CRUD
- branding settings
- logo upload
- watermark logo upload
- copyright text setting

Deliverables:
- app can show configured logo/branding
- export module can read watermark settings

### Sprint 5 - Project and multi-image management
Goal:
- project list
- create/edit/delete project
- project detail
- add many images per project
- upload/select template image
- reorder/delete project images

Deliverables:
- a project can contain multiple images
- each image can open editor

### Sprint 6 - Editor UI shell
Goal:
- editor route by project image
- canvas area
- mobile bottom toolbar
- desktop side panels
- region list placeholder
- glass selector placeholder
- export button placeholder

Deliverables:
- responsive editor shell ready
- no final rendering needed yet

### Sprint 7 - Region creation and grid panes
Goal:
- create rectangle region
- drag corners/edges
- convert to quadrilateral/polygon if feasible
- set rows/columns
- generate panes/cells
- confirm region
- save region and panes
- validate no overlap

Deliverables:
- user can create a region with many panes
- backend stores region and pane data

### Sprint 8 - Region editing actions
Goal:
- select region
- rename region
- move/resize/reshape region
- edit rows/columns
- regenerate panes
- copy/duplicate region
- delete region
- prevent overlap on edit/copy

Deliverables:
- full region CRUD/editing workflow

### Sprint 9 - Glass assignment and realistic preview MVP
Goal:
- assign glass product to region
- change glass product
- remove glass product
- render assigned glass inside panes
- use predefined material profile
- avoid tint/opacity sliders for normal users

Deliverables:
- a single image can show multiple regions with different glass products
- preview looks like material placement, not flat filter

### Sprint 10 - Export demo with watermark
Goal:
- export edited image
- render all regions/panes
- apply watermark/logo/copyright
- save export record
- allow download

Deliverables:
- exported demo image is branded and watermarked

### Sprint 11 - Security hardening and error handling
Goal:
- review JWT usage
- review role guards
- review ownership checks
- review upload safety
- improve try/catch and error messages
- ensure no secrets are leaked

Deliverables:
- security checklist completed
- error messages are useful and safe

### Sprint 12 - Polish and internal demo
Goal:
- responsive QA
- mobile/tablet usability improvements
- UI polish
- rendering polish
- sample data
- internal demo flow

Deliverables:
- app is ready for internal business testing

## 24. Acceptance criteria for MVP

The MVP is accepted when:
- user can login using JWT
- admin can manage glass categories/products
- admin can configure logo/watermark
- user can create project
- project can have multiple images
- image can have multiple non-overlapping glass regions
- region can contain multiple panes/cells
- user can adjust region geometry to match real image perspective
- user can copy/edit/delete regions
- user can assign/change/remove glass product per region
- different regions on the same image can use different glass products
- preview feels like glass placement, not color overlay
- export image includes watermark/copyright
- code includes useful Vietnamese comments
- errors are clear and safe
