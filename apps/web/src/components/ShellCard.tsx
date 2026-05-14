import type { ReactNode } from 'react';

// VI: Card shell nhe cho dashboard va cac trang entry, khong chua logic nghiep vu that.
export function ShellCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}
