# UI_PROMPTS.md

## Master prompt for UI generation

Design a modern, minimal, professional, mobile-first web application for an internal glass placement visualizer.

The app is used by a glass and aluminum company to create realistic demo images by placing predefined glass samples into selected window, balcony, railing, door, facade, or aluminum-frame regions.

Important:
This is not a color overlay editor and not a generic image filter tool.

Normal users should not see tint/opacity/hue sliders for final output. The glass appearance is configured by admin in advance. Normal users choose predefined glass products and adjust region geometry.

Visual style:
- clean white/light-gray background
- controlled red and black brand identity
- red as accent for primary actions and active states
- professional, calm, not flashy
- spacious layout
- easy to use on phone, tablet, laptop, and PC

Core workflow:
1. Login
2. Open dashboard
3. Create/open project
4. Add/select project image
5. Open glass placement editor
6. Create one or more non-overlapping glass regions
7. Adjust region corners/edges to match real image geometry
8. Split region into panes/cells if needed
9. Assign predefined glass product to region
10. Copy/edit/delete regions if needed
11. Export demo image with watermark

## Prompt - Login screen

Design a clean mobile-first login screen for Glass Demo Visualizer.

Include:
- company logo area
- app name
- email field
- password field
- login button
- language switcher
- red/black brand accent
- calm white/light-gray background
- professional internal business feel

Avoid marketing-heavy layout.

## Prompt - Dashboard

Design a mobile-first dashboard for internal staff.

Include:
- recent projects
- create project button
- quick access to project list
- simple stats: projects, images, exports
- clean red/black brand accent
- card layout on mobile
- wider grid layout on tablet/desktop

## Prompt - Project list

Design a responsive project list screen.

Include:
- search
- filters
- project cards on mobile
- table/grid hybrid on desktop
- project name
- customer name
- image count
- last edited
- status
- open project action
- create project action

## Prompt - Project detail with multiple images

Design a project detail screen where one project can contain many images.

Include:
- project info
- customer notes
- image gallery
- add image button
- each image card shows thumbnail, title, region count, last edited, open editor, export action
- reorder images
- delete image
- mobile card layout
- tablet/desktop grid layout

## Prompt - Glass placement editor

Design the main editor as a realistic glass placement tool.

Important:
Do not design it as a color overlay editor.
Do not show normal-user sliders for tint, opacity, hue, or transparency.

The editor should emphasize:
- region geometry editing
- corner handles
- edge handles
- polygon/quadrilateral adjustment
- perspective matching
- grid pane splitting
- predefined glass product assignment
- non-overlap validation
- realistic glass preview

Required UI areas:
- current project/image header
- central image canvas
- add region button
- selection/edit tool
- rectangle region tool
- quadrilateral/polygon region tool
- grid split tool
- region list
- selected region details
- glass product selector
- copy region action
- delete region action
- remove assigned glass action
- export button

Show selected region with handles, not as a big flat color filter.
The selected region should look like an editable installation boundary.

## Prompt - Editor mobile layout

Design the editor for mobile.

Include:
- canvas-first layout
- bottom toolbar with select/add region/grid/export
- bottom sheet for selected region settings
- bottom sheet for glass library
- large touch handles for corners/edges
- clear save/confirm/cancel actions
- warning state for overlap

## Prompt - Editor region creation flow

Design the flow for creating a glass region.

Steps shown in UI:
1. Draw initial rectangle
2. Drag corners/edges to fit real object
3. Optional convert to quadrilateral/polygon
4. Set rows/columns to create panes
5. Select one glass product
6. Confirm region

Show this as a simple guided panel, not a complex design tool.

## Prompt - Region management actions

Design region management interactions.

Each region can:
- be renamed
- be moved/resized/reshaped
- change rows/columns
- be copied
- be deleted
- have glass assigned
- have glass changed
- have glass removed

Show:
- region list item actions
- selected region panel
- confirm delete modal
- unassigned region state
- overlap warning
- duplicate region behavior

## Prompt - Admin glass product list

Design an admin screen for managing glass products.

Include:
- product list
- category filter
- search
- active/inactive toggle
- preview thumbnail
- material type
- create/edit/delete actions
- mobile cards
- desktop table

## Prompt - Admin glass product form

Design form for creating/editing glass products.

Include:
- name
- code
- category
- description
- preview image upload
- texture image upload optional
- material type
- appearance profile settings
- active status

This screen is admin-only, so appearance configuration may include tint/reflection/transmission controls here.

## Prompt - Branding settings

Design admin branding settings.

Include:
- company logo upload
- login logo upload
- header logo upload
- watermark logo upload
- primary/secondary/accent color
- copyright text
- watermark preview
- app header preview
- save button

Use red/black identity but keep UI clean.

## Prompt - Export demo modal

Design export demo modal/screen.

Include:
- final image preview
- watermark preview
- copyright notice
- export format
- export size
- confirm export
- cancel

Make clear that exported images include company watermark.
