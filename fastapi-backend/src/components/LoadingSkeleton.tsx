import React from 'react';

export const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Title Area Skeleton */}
    <div className="h-20 bg-white/[0.03] rounded-2xl border border-white/5" />

    {/* KPI Ribbon Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-28 bg-white/[0.03] rounded-xl border border-white/5" />
      ))}
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-white/[0.03] rounded-2xl border border-white/5" />
      <div className="h-64 bg-white/[0.03] rounded-2xl border border-white/5" />
    </div>

    {/* Competitor Radar Skeleton */}
    <div className="h-[400px] bg-white/[0.03] rounded-2xl border border-white/5" />
  </div>
);
