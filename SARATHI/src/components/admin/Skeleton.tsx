import React from 'react';

// Light gray placeholder rectangle with subtle pulse animation for progressive content loading.
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div
      style={{ width, height }}
      className={`bg-[#E5E7EB] animate-pulse rounded-[4px] ${className}`}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
