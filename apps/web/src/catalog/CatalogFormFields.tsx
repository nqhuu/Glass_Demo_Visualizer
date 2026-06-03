import type { ReactNode } from 'react';

// VI: Cac input dung lai cho form catalog de UI nhat quan tren mobile va desktop.
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <input
        className="mt-1 min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-red"
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <textarea
        className="mt-1 min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-red"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <select
        className="mt-1 min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-red"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function RangeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const clampedValue = Math.min(1, Math.max(0, value));

  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-neutral-800">
        {label}
        <span>{Math.round(clampedValue * 100)}%</span>
      </span>
      <input
        className="mt-2 w-full accent-red-700"
        max="1"
        min="0"
        // VI: Slider nay chi cho admin cau hinh profile vat lieu, cho phep dieu chinh chinh xac tung 1%.
        step="0.01"
        type="range"
        value={clampedValue}
        onChange={(event) => onChange(Math.min(1, Math.max(0, Number(event.target.value))))}
      />
    </label>
  );
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="min-w-28">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <input
        className="mt-1 min-h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-red"
        min="0"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
