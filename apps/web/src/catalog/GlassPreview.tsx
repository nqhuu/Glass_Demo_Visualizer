import type { GlassProduct } from './glass-catalog.types';

// VI: Component preview vat lieu kinh don gian, chua phai engine render len anh nha.
export function GlassPreview({ product }: { product: GlassProduct }) {
  const background = `linear-gradient(135deg, rgba(255,255,255,${product.transmissionLevel}) 0%, ${product.baseColor} 48%, rgba(255,255,255,${product.reflectivityLevel}) 100%)`;
  const shadowOpacity = Math.min(0.45, product.shadowLevel);

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-neutral-200 bg-stone-100">
      <div className="relative h-28" style={{ background }}>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.12)_38%,rgba(255,255,255,0)_39%)]" />
        <div className="absolute inset-x-4 bottom-3 h-4 rounded-full blur-md" style={{ backgroundColor: `rgba(0,0,0,${shadowOpacity})` }} />
        <div className="absolute inset-4 rounded-sm border border-white/70" />
      </div>
    </div>
  );
}
