import React from 'react';

// Small status indicator showing a 7px semantic dot beside plain status text per PRD design system.
export type StatusType = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface StatusDotProps {
  status: StatusType;
  label: string;
  className?: string;
}

const colorMap: Record<StatusType, string> = {
  success: 'bg-[#16A34A]',
  warning: 'bg-[#D97706]',
  danger: 'bg-[#DC2626]',
  neutral: 'bg-[#9CA3AF]',
  info: 'bg-[#4F46E5]',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, label, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] text-[#111827] font-normal ${className}`}>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${colorMap[status] || colorMap.neutral}`} />
      <span>{label}</span>
    </span>
  );
};

export default StatusDot;
