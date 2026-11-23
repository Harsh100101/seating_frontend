import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 8, cols = 8 }) => {
  return (
    <div className="ios-skeleton w-full overflow-hidden" aria-hidden="true">
      <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-slate-200 rounded"
            style={{ width: `${Math.max(50, 100 - i * 8)}px` }}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100 bg-white">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-12 flex items-center px-4 space-x-4">
            <div className="w-14 h-4 bg-slate-200 rounded font-mono" />
            <div className="w-20 h-4 bg-slate-200 rounded" />
            <div className="w-24 h-4 bg-slate-100 rounded" />
            <div className="w-20 h-4 bg-slate-100 rounded" />
            <div className="w-32 h-4 bg-slate-200 rounded" />
            <div className="w-40 h-4 bg-slate-200 rounded" />
            <div className="w-28 h-4 bg-slate-100 rounded" />
            <div className="w-16 h-6 bg-slate-200 rounded-full" />
            <div className="w-20 h-6 bg-slate-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="ios-skeleton grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 bg-white border border-slate-200 rounded-[20px] space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="w-24 h-3 bg-slate-200 rounded" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          </div>
          <div className="w-16 h-6 bg-slate-300 rounded" />
          <div className="w-32 h-2.5 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};
