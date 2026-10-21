import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'indigo' | 'success' | 'emerald' | 'warning' | 'amber' | 'danger' | 'rose' | 'navy' | 'gray';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  icon,
  dot = false,
  className = ''
}) => {
  const variantStyles = {
    blue: 'bg-blue-50 text-[#087BFA] border-blue-200/60',
    purple: 'bg-purple-50 text-[#603DF5] border-purple-200/60',
    indigo: 'bg-indigo-50 text-[#4F46E5] border-indigo-200/60',
    success: 'bg-emerald-50 text-[#16A34A] border-emerald-200/60',
    emerald: 'bg-emerald-50 text-[#059669] border-emerald-200/60',
    warning: 'bg-amber-50 text-[#D97706] border-amber-200/60',
    amber: 'bg-amber-50 text-[#D97706] border-amber-200/60',
    danger: 'bg-rose-50 text-[#DC2626] border-rose-200/60',
    rose: 'bg-rose-50 text-[#E11D48] border-rose-200/60',
    navy: 'bg-[#0B1B43]/10 text-[#0B1B43] border-[#0B1B43]/20',
    gray: 'bg-slate-100 text-[#405B8B] border-slate-200'
  };

  const dotColors = {
    blue: 'bg-[#087BFA]',
    purple: 'bg-[#603DF5]',
    indigo: 'bg-[#4F46E5]',
    success: 'bg-[#16A34A]',
    emerald: 'bg-[#059669]',
    warning: 'bg-[#D97706]',
    amber: 'bg-[#D97706]',
    danger: 'bg-[#DC2626]',
    rose: 'bg-[#E11D48]',
    navy: 'bg-[#0B1B43]',
    gray: 'bg-[#405B8B]'
  };

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />}
      {icon}
      <span>{children}</span>
    </span>
  );
};
