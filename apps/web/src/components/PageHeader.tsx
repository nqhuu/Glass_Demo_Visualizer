import type { ReactNode } from 'react';

// VI: Header dung chung cho cac page shell, giu cau truc title/action nhat quan.
export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{kicker}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-neutral-950 sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-700 sm:text-base">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
