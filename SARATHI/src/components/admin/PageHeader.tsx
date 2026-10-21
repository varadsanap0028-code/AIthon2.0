import React from 'react';

// Minimalist page header displaying 20px semi-bold title, explanatory subtitle, and optional primary/secondary action buttons.
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
      <div>
        <h1 className="text-[20px] font-semibold text-[#111827] tracking-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
