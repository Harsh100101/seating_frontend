import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeroHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  id?: string;
  actions?: React.ReactNode;
}

export const PageHeroHeader: React.FC<PageHeroHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  id = 'page-hero-title',
  actions,
}) => (
  <section
    className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 md:flex-row md:items-end md:justify-between"
    aria-labelledby={id}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{eyebrow}</span>
      </div>
      <h1 id={id} className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {actions && (
      <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
        {actions}
      </div>
    )}
  </section>
);
