import React, { useState } from 'react';
import { Info } from 'lucide-react';

// Metric card with 1px border, radius 8px, calculation explanation tooltip, and optional trend indicator.
export interface StatCardProps {
  label: string;
  value: string | number;
  calculationInfo?: string;
  change?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  calculationInfo,
  change,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-[8px] p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 relative">
        <span className="text-[14px] text-[#6B7280] font-medium">{label}</span>
        {calculationInfo && (
          <div className="relative inline-block">
            <button
              type="button"
              aria-label={`How ${label} is calculated`}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="text-[#9CA3AF] hover:text-[#4F46E5] transition-colors focus:outline-hidden"
            >
              <Info size={14} />
            </button>
            {showTooltip && (
              <div
                role="tooltip"
                className="absolute right-0 bottom-full mb-2 w-52 p-2 bg-[#111827] text-white text-[12px] leading-snug rounded-[6px] shadow-lg z-30 pointer-events-none"
              >
                {calculationInfo}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[26px] font-semibold text-[#111827] tracking-tight">{value}</span>
        {change && (
          <span
            className={`text-[12px] font-medium ${
              change.positive ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {change.value}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
