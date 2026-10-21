import React from 'react';

// Minimalist empty state pattern displaying a single clear explanatory sentence and optional primary next action.
export interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, action, className = '' }) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <p className="text-[14px] text-[#6B7280] max-w-md">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[6px] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
