import React from 'react';

// Accessible horizontal tab bar with subtle border indicator and clean contrast styling.
export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`border-b border-[#E5E7EB] flex items-center gap-6 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`pb-3 text-[14px] font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
              isActive
                ? 'text-[#111827] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4F46E5]" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
