import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'indigo' | 'green' | 'purple';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'blue',
  message,
  fullScreen = false,
  className = ''
}) => {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  const colorMap = {
    blue: 'border-[#087BFA]',
    indigo: 'border-[#4F46E5]',
    green: 'border-[#16A34A]',
    purple: 'border-[#603DF5]'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeMap[size]} ${colorMap[variant]} border-t-transparent rounded-full animate-spin shrink-0`}
        role="status"
        aria-label={message || 'Loading'}
      />
      {message && (
        <span className="text-xs font-semibold text-[#405B8B] tracking-wide animate-pulse">
          {message}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]">
        {spinner}
      </div>
    );
  }

  return spinner;
};
