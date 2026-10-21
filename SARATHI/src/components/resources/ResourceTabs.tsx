import React from 'react';
import { Sparkles } from 'lucide-react';
import type { MainTab } from './types';

interface ResourceTabsProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const TABS: { id: MainTab; label: string; hasSparkle?: boolean }[] = [
  { id: 'all', label: 'All Resources' },
  { id: 'recommended', label: 'Recommended for You', hasSparkle: true },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'bookmarked', label: 'Saved Items' },
];

export const ResourceTabs: React.FC<ResourceTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex items-center gap-2 border-b border-[#E0E7F2] pb-2.5 overflow-x-auto scrollbar-none">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[#603DF5] text-white shadow-xs font-bold'
                : 'text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100/80'
            }`}
          >
            {tab.hasSparkle && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
