import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-xs ${className}`}>
      <div className="space-y-1 min-w-0">
        {badge && <div className="mb-1.5">{badge}</div>}
        <h1 className="text-xl sm:text-2xl font-black text-[#0B1B43] tracking-tight leading-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-[#405B8B] leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
