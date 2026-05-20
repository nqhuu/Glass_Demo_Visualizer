import { BadRequestException } from '@nestjs/common';
import { GlassRegionBoundaryType } from '../enums/glass-region-boundary-type.enum';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface GeneratedPane {
  paneCode: string;
  points: NormalizedPoint[];
  rowIndex: number;
  columnIndex: number;
  sortOrder: number;
}

const EPSILON = 0.000001;

// VI: Chuan hoa va kiem tra geometry Sprint 7; pane generation can thu tu TL, TR, BR, BL.
export function validateBoundaryPoints(boundaryType: GlassRegionBoundaryType, points: NormalizedPoint[]): NormalizedPoint[] {
  if (boundaryType === GlassRegionBoundaryType.Polygon) {
    throw new BadRequestException('Polygon regions are planned for a later sprint.');
  }

  if (points.length !== 4) {
    throw new BadRequestException('Rectangle and quadrilateral regions require exactly four points.');
  }

  const normalized = points.map((point) => ({
    x: roundCoordinate(point.x),
    y: roundCoordinate(point.y),
  }));

  if (hasDuplicatePoints(normalized)) {
    throw new BadRequestException('Region boundary contains duplicate points.');
  }

  const ordered = orderQuadPoints(normalized);

  if (polygonArea(ordered) <= EPSILON) {
    throw new BadRequestException('Region boundary is too small.');
  }

  if (hasSelfIntersection(ordered) || !isConvexQuad(ordered)) {
    throw new BadRequestException('Region boundary is invalid.');
  }

  if (boundaryType === GlassRegionBoundaryType.Rectangle && !isAxisAlignedRectangle(ordered)) {
    throw new BadRequestException('Rectangle regions must be axis-aligned. Use a quadrilateral for perspective regions.');
  }

  return ordered;
}

// VI: Sinh pane bang noi suy song tuyen tinh tu 4 dinh theo thu tu TL, TR, BR, BL.
export function generateGridPanes(points: NormalizedPoint[], rows: number, columns: number): GeneratedPane[] {
  const panes: GeneratedPane[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const u0 = column / columns;
      const u1 = (column + 1) / columns;
      const v0 = row / rows;
      const v1 = (row + 1) / rows;
      const panePoints = [interpolateQuad(points, u0, v0), interpolateQuad(points, u1, v0), interpolateQuad(points, u1, v1), interpolateQuad(points, u0, v1)];

      panes.push({
        paneCode: `R${row + 1}C${column + 1}`,
        points: panePoints.map((point) => ({ x: roundCoordinate(point.x), y: roundCoordinate(point.y) })),
        rowIndex: row,
        columnIndex: column,
        sortOrder: row * columns + column,
      });
    }
  }

  return panes;
}

// VI: Kiem tra chong lan co dien tich; tiep xuc canh/dinh khong bi tinh la overlap.
export function polygonsOverlap(candidate: NormalizedPoint[], existing: NormalizedPoint[]): boolean {
  if (!boundingBoxesOverlap(candidate, existing)) {
    return false;
  }

  for (let i = 0; i < candidate.length; i += 1) {
    const a1 = candidate[i];
    const a2 = candidate[(i + 1) % candidate.length];

    for (let j = 0; j < existing.length; j += 1) {
      const b1 = existing[j];
      const b2 = existing[(j + 1) % existing.length];

      if (segmentsStrictlyCross(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return candidate.some((point) => pointStrictlyInsidePolygon(point, existing)) || existing.some((point) => pointStrictlyInsidePolygon(point, candidate));
}

function interpolateQuad(points: NormalizedPoint[], u: number, v: number): NormalizedPoint {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const top = lerpPoint(topLeft, topRight, u);
  const bottom = lerpPoint(bottomLeft, bottomRight, u);
  return lerpPoint(top, bottom, v);
}

function lerpPoint(start: NormalizedPoint, end: NormalizedPoint, t: number): NormalizedPoint {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
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

function hasDuplicatePoints(points: NormalizedPoint[]): boolean {
  return points.some((point, index) =>
    points.slice(index + 1).some((other) => Math.abs(point.x - other.x) <= EPSILON && Math.abs(point.y - other.y) <= EPSILON),
  );
}

function orderQuadPoints(points: NormalizedPoint[]): NormalizedPoint[] {
  // VI: Dung tong/hieu toa do de dua input hop le ve thu tu TL, TR, BR, BL cho noi suy pane.
  const topLeft = findUniqueCorner(points, (point) => point.x + point.y, 'min');
  const bottomRight = findUniqueCorner(points, (point) => point.x + point.y, 'max');
  const topRight = findUniqueCorner(points, (point) => point.x - point.y, 'max');
  const bottomLeft = findUniqueCorner(points, (point) => point.x - point.y, 'min');
  const ordered = [topLeft, topRight, bottomRight, bottomLeft];

  if (new Set(ordered.map((point) => `${point.x}:${point.y}`)).size !== 4) {
    throw new BadRequestException('Region boundary points cannot be safely ordered.');
  }

  return ordered;
}

function findUniqueCorner(points: NormalizedPoint[], score: (point: NormalizedPoint) => number, mode: 'min' | 'max'): NormalizedPoint {
  const sorted = [...points].sort((a, b) => (mode === 'min' ? score(a) - score(b) : score(b) - score(a)));
  if (Math.abs(score(sorted[0]) - score(sorted[1])) <= EPSILON) {
    throw new BadRequestException('Region boundary points cannot be safely ordered.');
  }
  return sorted[0];
}

function isConvexQuad(points: NormalizedPoint[]): boolean {
  const signs = points.map((point, index) => direction(point, points[(index + 1) % points.length], points[(index + 2) % points.length]));
  if (signs.some((value) => Math.abs(value) <= EPSILON)) {
    return false;
  }

  return signs.every((value) => value > 0) || signs.every((value) => value < 0);
}

function isAxisAlignedRectangle(points: NormalizedPoint[]): boolean {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  return (
    Math.abs(topLeft.y - topRight.y) <= EPSILON &&
    Math.abs(bottomLeft.y - bottomRight.y) <= EPSILON &&
    Math.abs(topLeft.x - bottomLeft.x) <= EPSILON &&
    Math.abs(topRight.x - bottomRight.x) <= EPSILON
  );
}

function hasSelfIntersection(points: NormalizedPoint[]): boolean {
  for (let i = 0; i < points.length; i += 1) {
    const a1 = points[i];
    const a2 = points[(i + 1) % points.length];

    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) {
        continue;
      }

      if (segmentsStrictlyCross(a1, a2, points[j], points[(j + 1) % points.length])) {
        return true;
      }
    }
  }

  return false;
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

function polygonArea(points: NormalizedPoint[]): number {
  const signed = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(signed) / 2;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
