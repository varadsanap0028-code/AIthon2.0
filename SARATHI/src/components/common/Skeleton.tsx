import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '16px',
  borderRadius = '4px',
}) => (
  <div
    className={`animate-pulse bg-[#E0E7F2] rounded-${borderRadius === 'full' ? 'full' : 'md'} ${className}`}
    style={{ width, height, borderRadius }}
    aria-hidden="true"
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="14px" borderRadius="4px" />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-2xl border border-[#E0E7F2] p-6 ${className}`}>
    <div className="space-y-4">
      <Skeleton width="40%" height="10px" />
      <Skeleton width="100%" height="10px" />
      <div className="flex gap-4">
        <Skeleton width="33%" height="10px" />
        <Skeleton width="33%" height="10px" />
        <Skeleton width="33%" height="10px" />
      </div>
    </div>
  </div>
);
