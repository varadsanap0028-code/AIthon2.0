import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'purple' | 'indigo' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'white';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isFullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const effectiveLeftIcon = leftIcon || icon;
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-[#087BFA] hover:bg-[#0068DE] text-white shadow-md shadow-blue-500/20 focus-visible:ring-[#087BFA]',
    purple: 'bg-[#603DF5] hover:bg-[#4C26E0] text-white shadow-md shadow-purple-500/20 focus-visible:ring-[#603DF5]',
    indigo: 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-md shadow-indigo-500/20 focus-visible:ring-[#4F46E5]',
    secondary: 'bg-[#F4F7FC] hover:bg-[#E0E7F2] text-[#0B1B43] border border-[#E0E7F2] focus-visible:ring-[#087BFA]',
    white: 'bg-white hover:bg-slate-100 text-[#0B1B43] shadow-md focus-visible:ring-white border border-transparent font-bold',
    outline: 'border border-[#087BFA] text-[#087BFA] hover:bg-blue-50/50 focus-visible:ring-[#087BFA]',
    ghost: 'text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100 focus-visible:ring-[#087BFA]',
    danger: 'bg-[#DC2626] hover:bg-red-700 text-white shadow-md shadow-red-500/20 focus-visible:ring-[#DC2626]',
    success: 'bg-[#16A34A] hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 focus-visible:ring-[#16A34A]',
    warning: 'bg-[#D97706] hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 focus-visible:ring-[#D97706]'
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5'
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], isFullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        effectiveLeftIcon
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon}
    </button>
  );
};
