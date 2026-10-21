import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import type { SortOption } from './types';

interface ResourceFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  freeOnly: boolean;
  onFreeOnlyChange: (freeOnly: boolean) => void;
}

const FORMAT_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Formats' },
  { id: 'video', label: 'Videos' },
  { id: 'playlist', label: 'Playlists' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'interactive', label: 'Interactive' },
  { id: 'handbook', label: 'Handbooks' },
];

const DOMAIN_OPTIONS = [
  { id: 'all', label: 'All Domains' },
  { id: 'dom-frontend', label: 'Frontend & Web' },
  { id: 'dom-backend', label: 'Backend & Systems' },
  { id: 'dom-aiml', label: 'AI & Machine Learning' },
  { id: 'dom-clouddevops', label: 'Cloud & DevOps' },
  { id: 'dom-cybersecurity', label: 'Cybersecurity' },
];

const LEVEL_OPTIONS = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export const ResourceFilters: React.FC<ResourceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedFormat,
  onFormatChange,
  selectedDomain,
  onDomainChange,
  selectedLevel,
  onLevelChange,
  sortBy,
  onSortChange,
  freeOnly,
  onFreeOnlyChange,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Format Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FORMAT_TABS.map((tab) => {
          const isActive = selectedFormat === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFormatChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#0B1B43] text-white shadow-xs font-semibold'
                  : 'bg-white text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-50 border border-[#E0E7F2] font-medium shadow-2xs'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search, Domain, Level, and Sort Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#405B8B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, channel, provider, or skill tag..."
            className="w-full pl-10 pr-3.5 py-2 bg-white border border-[#E0E7F2] rounded-xl text-xs text-[#0B1B43] placeholder-[#405B8B]/60 focus:outline-hidden focus:border-[#603DF5] focus:ring-2 focus:ring-[#603DF5]/15 transition-all shadow-2xs"
          />
        </div>

        {/* Domain Filter Dropdown */}
        <select
          value={selectedDomain}
          onChange={(e) => onDomainChange(e.target.value)}
          aria-label="Filter by domain"
          className="px-3.5 py-2 bg-white border border-[#E0E7F2] rounded-xl text-xs text-[#0B1B43] font-medium focus:outline-hidden focus:border-[#603DF5] cursor-pointer shadow-2xs"
        >
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>

        {/* Level Filter Dropdown */}
        <select
          value={selectedLevel}
          onChange={(e) => onLevelChange(e.target.value)}
          aria-label="Filter by difficulty level"
          className="px-3.5 py-2 bg-white border border-[#E0E7F2] rounded-xl text-xs text-[#0B1B43] font-medium focus:outline-hidden focus:border-[#603DF5] cursor-pointer shadow-2xs"
        >
          {LEVEL_OPTIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 bg-white border border-[#E0E7F2] rounded-xl px-3 py-2 shadow-2xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#405B8B]" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort resources"
            className="bg-transparent text-xs text-[#0B1B43] font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="recommended">Recommended</option>
            <option value="newest">Newest</option>
            <option value="shortest">Shortest Duration</option>
            <option value="longest">Longest Duration</option>
          </select>
        </div>

        {/* Free Only Toggle */}
        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-white border border-[#E0E7F2] rounded-xl text-xs text-[#405B8B] hover:text-[#0B1B43] select-none hover:bg-slate-50 transition-colors shadow-2xs font-medium">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => onFreeOnlyChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#603DF5] focus:ring-0 focus:ring-offset-0 accent-[#603DF5]"
          />
          <span>Free Only</span>
        </label>
      </div>
    </div>
  );
};
