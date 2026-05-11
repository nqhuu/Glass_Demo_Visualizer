# RENDERING_SPEC.md

## Purpose

This file defines how the application should render glass in the editor and export output.

The most important rule:

> Render glass as realistic material placement, not as a flat color overlay or image filter.

## Visual goal

The output should look like real glass panels inserted into selected installation regions.

The result should preserve:
- aluminum frames
- railings
- posts
- handles
- fittings
- mullions
- borders
- surrounding building structure

The glass should feel like a material inside the selected pane, not a transparent color block painted over the image.

## Region-based rendering

Rendering is based on:

```text
ProjectImage
  -> GlassRegion[]
      -> GlassRegionPane[]
```

Each region has one glass material. All panes inside that region use the same material.

Different regions can use different materials.

## Material profile

Each glass product should have a material appearance profile:
- material type: clear / tinted / reflective / frosted / patterned
- base tint color
- tint strength
- transmission level
- reflectivity level
- shadow level
- texture intensity
- edge treatment
- realism preset

Admin configures these values.

Normal users only select the glass product.

## MVP rendering approach

For MVP, use a believable 2D rendering pipeline:

1. Clip rendering to each pane polygon.
2. Apply predefined material color/texture.
3. Preserve original image detail where useful.
4. Add subtle reflection/shadow based on preset.
5. Keep the result restrained and realistic.
6. Export the composited result with watermark.

## What to avoid

Do not build the normal editor as:
- opacity slider editor
- hue/saturation editor
- tint painting tool
- Photoshop-like layer editor
- generic transparent rectangle overlay

Do not show normal users final-output sliders such as:
- tint opacity
- hue
- saturation
- transparency
- color picker for material color

These values belong in admin material configuration.

## Geometry and perspective

The user can adjust region geometry to match the real photo:
- move region
- resize region
- drag corners
- drag edges
- use quadrilateral/polygon boundaries
- split into panes

For folded balcony glass, use multiple adjacent regions or polygons/quads that follow the actual railing direction.

## Pane rendering

Each pane should be rendered separately so that:
- grid lines remain clear
- glass panels feel distinct
- panel borders can be preserved
- slight edge depth can be added later

## Export rendering

Export must:
- include all assigned regions
- skip unassigned regions or show original image in those areas
- apply watermark/logo/copyright
- save export metadata

## Future improvements

Possible later upgrades:
- image brightness analysis
- environment-aware reflection
- AI-assisted frame detection
- automatic pane detection
- advanced perspective texture mapping
- server-side high-resolution export
