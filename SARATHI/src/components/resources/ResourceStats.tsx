import React from 'react';
import { TrendingUp, CheckCircle2, BookmarkCheck } from 'lucide-react';

interface ResourceStatsProps {
  inProgressCount: number;
  completedCount: number;
  bookmarkedCount: number;
}

export const ResourceStats: React.FC<ResourceStatsProps> = ({
  inProgressCount,
  completedCount,
  bookmarkedCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* IN PROGRESS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E7F2] shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">
            In Progress
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#0B1B43]">
            {inProgressCount}
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-inner">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>

      {/* COMPLETED */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E7F2] shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">
            Completed Learning
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {completedCount}
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* SAVED */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E7F2] shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">
            Saved Items
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#603DF5]">
            {bookmarkedCount}
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#603DF5] border border-purple-200/60 flex items-center justify-center shadow-inner">
          <BookmarkCheck className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
