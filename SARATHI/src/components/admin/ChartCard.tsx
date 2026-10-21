import React from 'react';

// Minimal container card for Recharts with title, optional subtitle, and right-aligned action control.
export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-[#E5E7EB] rounded-[8px] p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
          {subtitle && <p className="text-[13px] text-[#6B7280] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};

export default ChartCard;
