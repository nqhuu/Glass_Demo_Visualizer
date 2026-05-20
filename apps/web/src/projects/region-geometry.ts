import type { GlassRegion, NormalizedPoint } from './project.types';

export interface DraftPane {
  paneCode: string;
  points: NormalizedPoint[];
}

const EPSILON = 0.000001;

// VI: Sinh duong pane preview tu 4 diem region theo toa do chuan hoa.
export function generatePreviewPanes(points: NormalizedPoint[], rows: number, columns: number): DraftPane[] {
  const panes: DraftPane[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const u0 = column / columns;
      const u1 = (column + 1) / columns;
      const v0 = row / rows;
      const v1 = (row + 1) / rows;
      panes.push({
        paneCode: `R${row + 1}C${column + 1}`,
        points: [interpolateQuad(points, u0, v0), interpolateQuad(points, u1, v0), interpolateQuad(points, u1, v1), interpolateQuad(points, u0, v1)],
      });
    }
  }

  return panes;
}

// VI: Check chong lan phia client de canh bao som; backend van check lai truoc khi luu.
export function draftOverlapsRegions(points: NormalizedPoint[], regions: GlassRegion[]): boolean {
  return regions.some((region) => polygonsOverlap(points, region.boundaryPointsJson));
}

export function clampPoint(point: NormalizedPoint): NormalizedPoint {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

export function pointsToSvg(points: NormalizedPoint[]): string {
  return points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ');
}

function interpolateQuad(points: NormalizedPoint[], u: number, v: number): NormalizedPoint {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const top = lerpPoint(topLeft, topRight, u);
  const bottom = lerpPoint(bottomLeft, bottomRight, u);
  return lerpPoint(top, bottom, v);
}

function lerpPoint(start: NormalizedPoint, end: NormalizedPoint, t: number): NormalizedPoint {
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}

function polygonsOverlap(candidate: NormalizedPoint[], existing: NormalizedPoint[]): boolean {
  if (!boundingBoxesOverlap(candidate, existing)) {
    return false;
  }

  for (let i = 0; i < candidate.length; i += 1) {
    const a1 = candidate[i];
    const a2 = candidate[(i + 1) % candidate.length];
    for (let j = 0; j < existing.length; j += 1) {
      if (segmentsStrictlyCross(a1, a2, existing[j], existing[(j + 1) % existing.length])) {
        return true;
      }
    }
  }

  return candidate.some((point) => pointStrictlyInsidePolygon(point, existing)) || existing.some((point) => pointStrictlyInsidePolygon(point, candidate));
}

function boundingBoxesOverlap(a: NormalizedPoint[], b: NormalizedPoint[]): boolean {
  const boxA = getBoundingBox(a);
  const boxB = getBoundingBox(b);
  return boxA.minX < boxB.maxX - EPSILON && boxA.maxX > boxB.minX + EPSILON && boxA.minY < boxB.maxY - EPSILON && boxA.maxY > boxB.minY + EPSILON;
}

function getBoundingBox(points: NormalizedPoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return points.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      minY: Math.min(box.minY, point.y),
      maxX: Math.max(box.maxX, point.x),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
}

function segmentsStrictlyCross(a1: NormalizedPoint, a2: NormalizedPoint, b1: NormalizedPoint, b2: NormalizedPoint): boolean {
  const d1 = direction(a1, a2, b1);
  const d2 = direction(a1, a2, b2);
  const d3 = direction(b1, b2, a1);
  const d4 = direction(b1, b2, a2);
  return d1 * d2 < -EPSILON && d3 * d4 < -EPSILON;
}

function direction(a: NormalizedPoint, b: NormalizedPoint, c: NormalizedPoint): number {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

function pointStrictlyInsidePolygon(point: NormalizedPoint, polygon: NormalizedPoint[]): boolean {
  if (pointOnPolygonBoundary(point, polygon)) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = pi.y > point.y !== pj.y > point.y && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointOnPolygonBoundary(point: NormalizedPoint, polygon: NormalizedPoint[]): boolean {
  return polygon.some((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const cross = Math.abs(direction(start, end, point));
    const dot = (point.x - start.x) * (point.x - end.x) + (point.y - start.y) * (point.y - end.y);
    return cross <= EPSILON && dot <= EPSILON;
  });
}
