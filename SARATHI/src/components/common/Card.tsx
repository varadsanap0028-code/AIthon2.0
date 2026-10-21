import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  borderAccent?: 'none' | 'blue' | 'purple' | 'green' | 'amber' | 'indigo' | 'rose';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  borderAccent = 'none',
  padding = 'md',
  header,
  footer,
  onClick,
  id
}) => {
  const accentStyles = {
    none: '',
    blue: 'border-l-4 border-l-[#087BFA]',
    purple: 'border-l-4 border-l-[#603DF5]',
    indigo: 'border-l-4 border-l-[#4F46E5]',
    green: 'border-l-4 border-l-[#16A34A]',
    amber: 'border-l-4 border-l-[#D97706]',
    rose: 'border-l-4 border-l-[#DC2626]'
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#E0E7F2] shadow-xs ${paddingStyles[padding]} ${
        hoverEffect ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 cursor-pointer' : ''
      } ${accentStyles[borderAccent]} ${className}`}
    >
      {header && <div className="border-b border-[#E0E7F2] pb-4 mb-4">{header}</div>}
      {children}
      {footer && <div className="border-t border-[#E0E7F2] pt-4 mt-4">{footer}</div>}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 pb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold text-[#0B1B43] tracking-tight leading-none ${className}`}>{children}</h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-xs text-[#405B8B] leading-relaxed ${className}`}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pt-0 ${className}`}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex items-center pt-4 border-t border-[#E0E7F2] ${className}`}>{children}</div>
);
