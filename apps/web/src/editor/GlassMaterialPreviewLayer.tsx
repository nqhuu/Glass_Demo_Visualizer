import type { GlassMaterialType, GlassProduct } from '../catalog/glass-catalog.types';
import { resolveCatalogTextureUrl } from '../projects/project-api';
import type { GlassRegion } from '../projects/project.types';
import { pointsToSvg } from '../projects/region-geometry';

// VI: Layer SVG render preview kinh MVP, clip tung pane rieng va dung profile vat lieu admin da cau hinh.
export function GlassMaterialPreviewLayer({ regions }: { regions: GlassRegion[] }) {
  const assignedRegions = regions.filter((region) => region.glassProduct && region.panes.length > 0);

  if (assignedRegions.length === 0) {
    return null;
  }

  return (
    <g className="pointer-events-none">
      <defs>
        {assignedRegions.flatMap((region) =>
          region.panes.map((pane) => {
            const id = getPaneId(region.id, pane.id);
            const product = region.glassProduct as GlassProduct;
            const renderProfile = getRegionRenderProfile(region, product);
            // VI: previewImageUrl chi dung cho card catalog; render vat lieu chi dung textureImageUrl, neu thieu thi fallback bang gradient/pattern nhe.
            const textureUrl = resolveCatalogTextureUrl(product.textureImageUrl);

            return (
              <g key={`defs-${id}`}>
                <clipPath id={`glass-clip-${id}`}>
                  <polygon points={pointsToSvg(pane.panePointsJson)} />
                </clipPath>
                <linearGradient id={`glass-highlight-${id}`} x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={getHighlightOpacity(product, renderProfile)} />
                  <stop offset="42%" stopColor="#ffffff" stopOpacity="0.04" />
                  <stop offset="100%" stopColor={product.baseColor} stopOpacity={getBaseOpacity(product, renderProfile) * 0.55} />
                </linearGradient>
                <linearGradient id={`glass-reflection-${id}`} x1="0%" x2="100%" y1="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="44%" stopColor="#ffffff" stopOpacity={getReflectionOpacity(product, renderProfile)} />
                  <stop offset="52%" stopColor="#ffffff" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                {textureUrl ? (
                  <pattern id={`glass-texture-${id}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                    <image href={textureUrl} x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice" opacity={getTextureOpacity(product)} />
                  </pattern>
                ) : null}
              </g>
            );
          }),
        )}
      </defs>

      {assignedRegions.flatMap((region) =>
        region.panes.map((pane) => {
          const id = getPaneId(region.id, pane.id);
          const product = region.glassProduct as GlassProduct;
          const renderProfile = getRegionRenderProfile(region, product);
          // VI: Khong dung anh preview san pham lam texture pane de tranh cat thumbnail/photo vao vung kinh.
          const textureUrl = resolveCatalogTextureUrl(product.textureImageUrl);

          return (
            <g key={`glass-preview-${id}`} clipPath={`url(#glass-clip-${id})`}>
              <polygon points={pointsToSvg(pane.panePointsJson)} fill={product.baseColor} opacity={getBaseOpacity(product, renderProfile)} />
              <polygon points={pointsToSvg(pane.panePointsJson)} fill={`url(#glass-highlight-${id})`} />
              <polygon points={pointsToSvg(pane.panePointsJson)} fill={`url(#glass-reflection-${id})`} />
              {textureUrl ? <polygon points={pointsToSvg(pane.panePointsJson)} fill={`url(#glass-texture-${id})`} /> : null}
              {product.materialType === 'patterned' || product.materialType === 'frosted' ? <PatternLines points={pointsToSvg(pane.panePointsJson)} materialType={product.materialType} /> : null}
              <polygon points={pointsToSvg(pane.panePointsJson)} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />
            </g>
          );
        }),
      )}
    </g>
  );
}

function PatternLines({ points, materialType }: { points: string; materialType: GlassMaterialType }) {
  // VI: Pattern nhe de goi y kinh mo/hoa van, khong phai filter mau phang.
  const strokeOpacity = materialType === 'frosted' ? 0.12 : 0.2;

  return (
    <g>
      <polygon points={points} fill={materialType === 'frosted' ? '#ffffff' : 'none'} opacity={materialType === 'frosted' ? 0.13 : 1} />
      {Array.from({ length: 6 }).map((_, index) => (
        <line key={`pattern-${index}`} x1={index * 18 - 12} x2={index * 18 + 26} y1="0" y2="100" stroke="#ffffff" strokeOpacity={strokeOpacity} strokeWidth="0.16" vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

function getPaneId(regionId: number, paneId: number): string {
  return `${regionId}-${paneId}`;
}

function getRegionRenderProfile(region: GlassRegion, product: GlassProduct): { tintStrength: number; reflectivityLevel: number; transmissionLevel: number; shadowLevel: number } {
  // VI: Preview uu tien cau hinh da ap dung tren region; product cu khong co field moi van fallback an toan.
  return {
    tintStrength: percentToRatio(region.appliedTintPercent, product.tintStrength),
    reflectivityLevel: percentToRatio(region.appliedReflectivityPercent, product.reflectivityLevel),
    transmissionLevel: percentToRatio(region.appliedTransmissionPercent, product.transmissionLevel),
    shadowLevel: percentToRatio(region.appliedShadowPercent, product.shadowLevel),
  };
}

function percentToRatio(value: number | null | undefined, fallback: number): number {
  return value === null || value === undefined ? fallback : clamp(value / 100, 0, 1);
}

function getBaseOpacity(product: GlassProduct, renderProfile: { tintStrength: number; transmissionLevel: number }): number {
  const typeBoost = product.materialType === 'tinted' ? 0.18 : product.materialType === 'frosted' ? 0.24 : product.materialType === 'reflective' ? 0.12 : 0.08;
  return clamp(0.05 + renderProfile.tintStrength * 0.22 + (1 - renderProfile.transmissionLevel) * 0.18 + typeBoost, 0.08, 0.48);
}

function getHighlightOpacity(product: GlassProduct, renderProfile: { transmissionLevel: number; reflectivityLevel: number }): number {
  return clamp(0.1 + renderProfile.transmissionLevel * 0.18 + renderProfile.reflectivityLevel * 0.18, 0.12, 0.42);
}

function getReflectionOpacity(product: GlassProduct, renderProfile: { reflectivityLevel: number }): number {
  const boost = product.materialType === 'reflective' ? 0.22 : 0;
  return clamp(0.06 + renderProfile.reflectivityLevel * 0.28 + boost, 0.08, 0.5);
}

function getTextureOpacity(product: GlassProduct): number {
  return product.materialType === 'patterned' ? 0.22 : product.materialType === 'frosted' ? 0.14 : 0.1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
