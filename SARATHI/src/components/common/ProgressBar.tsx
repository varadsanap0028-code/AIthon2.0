import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: 'blue' | 'purple' | 'indigo' | 'green' | 'emerald' | 'amber' | 'rose' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  labelPosition?: 'right' | 'top';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'gradient',
  size = 'md',
  showLabel = false,
  className = '',
  labelPosition = 'right'
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colors = {
    blue: 'bg-[#087BFA]',
    purple: 'bg-[#603DF5]',
    indigo: 'bg-[#4F46E5]',
    green: 'bg-[#16A34A]',
    emerald: 'bg-[#059669]',
    amber: 'bg-[#D97706]',
    rose: 'bg-[#E11D48]',
    gradient: 'bg-gradient-to-r from-[#087BFA] to-[#603DF5]'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center mb-1 text-xs font-semibold text-[#405B8B]">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div className={`w-full bg-[#E0E7F2] rounded-full overflow-hidden ${sizeStyles[size]}`}>
          <div
            className={`${colors[color]} ${sizeStyles[size]} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {showLabel && labelPosition === 'right' && (
          <span className="text-xs font-semibold text-[#405B8B] min-w-[2.5rem] text-right">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
    </div>
  );
};
