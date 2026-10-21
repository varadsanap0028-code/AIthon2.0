import React, { useState, useEffect } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { useDebounce } from './useDebounce';

// Search and filtering bar with debounced input, dropdown selects, active count, and reset button synced with URL state.
export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectConfig {
  key?: string;
  id?: string;
  label: string;
  options: FilterSelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  searchQuery?: string;
  searchValue?: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelectConfig[];
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  className = '',
}) => {
  const currentVal = searchValue ?? searchQuery ?? '';
  const [localSearch, setLocalSearch] = useState(currentVal);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    setLocalSearch(currentVal);
  }, [currentVal]);

  useEffect(() => {
    if (debouncedSearch !== currentVal) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, currentVal]);

  const hasActiveFilters =
    Boolean(localSearch.trim()) || filters.some((f) => f.value && f.value !== 'all');

  const handleReset = () => {
    setLocalSearch('');
    onSearchChange('');
    filters.forEach((f) => f.onChange('all'));
    if (onReset) onReset();
  };

  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-[8px] p-3 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
        {/* Search Input */}
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 text-[13px] text-[#111827] bg-[#FAFAFA] border border-[#E5E7EB] rounded-[6px] focus:outline-hidden focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] placeholder-[#9CA3AF] transition-colors"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Select Filters */}
        {filters.map((filter) => (
          <div key={filter.key || filter.id || filter.label} className="flex items-center gap-1.5">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              aria-label={filter.label}
              className="py-1.5 pl-2.5 pr-8 text-[13px] text-[#111827] bg-white border border-[#E5E7EB] rounded-[6px] hover:border-[#D1D5DB] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors cursor-pointer"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#111827] px-2.5 py-1.5 rounded-[6px] border border-transparent hover:border-[#E5E7EB] transition-colors"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};

export default FilterBar;
