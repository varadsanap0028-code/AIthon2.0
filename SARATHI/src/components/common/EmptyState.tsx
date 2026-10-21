import React from 'react';
import { FolderSearch } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'blue',
  className = ''
}) => {
  const iconBgStyles = {
    blue: 'bg-blue-50 text-[#087BFA]',
    indigo: 'bg-indigo-50 text-[#4F46E5]',
    purple: 'bg-purple-50 text-[#603DF5]',
    emerald: 'bg-emerald-50 text-[#16A34A]',
    amber: 'bg-amber-50 text-[#D97706]'
  };

  const renderIcon = () => {
    if (!icon) return <FolderSearch className="w-8 h-8" />;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="w-8 h-8" />;
  };

  return (
    <div className={`text-center py-12 px-4 max-w-md mx-auto space-y-4 ${className}`}>
      <div className={`w-16 h-16 rounded-3xl ${iconBgStyles[variant]} flex items-center justify-center mx-auto shadow-inner`}>
        {renderIcon()}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-[#0B1B43] tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-[#405B8B] leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
