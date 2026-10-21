import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface DashboardHeaderProps {
  range: '7d' | '30d' | '90d';
  onRangeChange: (range: '7d' | '30d' | '90d') => void;
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  range,
  onRangeChange,
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
}) => {
  const getUpdatedAgo = (): string => {
    if (!lastRefreshedAt) return 'Never';
    const seconds = Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const ranges: { key: '7d' | '30d' | '90d'; label: string }[] = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
      <div>
        <h1 className="text-[20px] font-semibold text-[#111827] tracking-tight">Overview Dashboard</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">
          Platform pulse, key metrics, and system-wide activity at a glance.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* Range Segmented Switch */}
        <div
          role="group"
          aria-label="Analytics date range"
          className="inline-flex rounded-[6px] border border-[#E5E7EB] bg-white p-0.5"
        >
          {ranges.map((r) => {
            const isActive = range === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => onRangeChange(r.key)}
                className={`px-3 py-1 text-[13px] font-medium rounded-[4px] transition-colors focus:outline-hidden ${
                  isActive
                    ? 'bg-[#4F46E5] text-white shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Updated counter and Refresh action */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6B7280] whitespace-nowrap">
            Updated {getUpdatedAgo()}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh dashboard data"
            title="Refresh metrics immediately"
            className="p-1.5 rounded-[6px] border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] transition-colors focus:outline-hidden disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#4F46E5]' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
