import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Right-side 560px sliding detail drawer with backdrop, escape key closure, and single soft elevation shadow.
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'max-w-[560px]',
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`w-screen ${width} bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col justify-between`}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">{title}</h2>
              {subtitle && <p className="text-[13px] text-[#6B7280] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-[6px] transition-colors focus:outline-hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
