import React from 'react';
import { FolderGit2, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface ProjectKpiRowProps {
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  uniqueSkillsCount: number;
}

export const ProjectKpiRow: React.FC<ProjectKpiRowProps> = ({
  totalCount,
  verifiedCount,
  pendingCount,
  uniqueSkillsCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-[#E0E7F2] p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#087BFA] flex items-center justify-center shrink-0">
          <FolderGit2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Repositories</span>
          <span className="text-xl font-black text-[#0B1B43]">{totalCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E0E7F2] p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Verified Proofs</span>
          <span className="text-xl font-black text-[#0B1B43]">{verifiedCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E0E7F2] p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#603DF5] flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Under Review</span>
          <span className="text-xl font-black text-[#0B1B43]">{pendingCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E0E7F2] p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Evidenced Skills</span>
          <span className="text-xl font-black text-[#0B1B43]">{uniqueSkillsCount}</span>
        </div>
      </div>
    </div>
  );
};
