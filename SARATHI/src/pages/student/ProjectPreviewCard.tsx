import React from 'react';
import {
  GitBranch,
  Globe,
  Sparkles,
  Star,
  GitFork,
  CheckCircle2,
  Layers,
  Check
} from 'lucide-react';

export interface ExtractedProjectData {
  title: string;
  description: string;
  repositoryUrl: string;
  liveDemoUrl?: string;
  screenshotUrl?: string;
  technologies: string[];
  skillsDemonstrated: string[];
  primaryLanguage?: string;
  stars?: number;
  forks?: number;
  architecture?: string;
  keyFeatures?: string[];
}

interface ProjectPreviewCardProps {
  data: ExtractedProjectData;
  onToggleEdit?: () => void;
  isEditing?: boolean;
}

export const ProjectPreviewCard: React.FC<ProjectPreviewCardProps> = ({
  data,
  onToggleEdit,
  isEditing,
}) => {
  return (
    <div className="bg-slate-50 border border-[#E0E7F2] rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Evidence Extracted Automatically
            </span>
            {data.primaryLanguage && (
              <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {data.primaryLanguage}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#0B1B43] mt-1.5">{data.title}</h3>
        </div>

        {onToggleEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="text-xs font-bold text-[#087BFA] hover:text-[#065ec0] cursor-pointer shrink-0 underline"
          >
            {isEditing ? 'Hide Manual Edit' : 'Edit Extracted Info'}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[#405B8B] leading-relaxed">{data.description}</p>

      {/* Architecture Tag if present */}
      {data.architecture && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
          <Layers className="w-4 h-4 text-[#087BFA] shrink-0" />
          <span className="font-bold text-[#0B1B43]">Architecture:</span>
          <span className="truncate">{data.architecture}</span>
        </div>
      )}

      {/* Technologies & Inferred Skills */}
      <div className="space-y-2.5">
        <div>
          <span className="text-[10px] font-bold text-[#0B1B43] uppercase tracking-wider block mb-1">
            Detected Technologies ({data.technologies.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {data.technologies.length > 0 ? (
              data.technologies.map((t) => (
                <span key={t} className="text-[11px] font-semibold bg-white border border-slate-200 text-[#0B1B43] px-2 py-0.5 rounded-md">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">None detected</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#603DF5] uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#603DF5]" />
            Inferred Demonstrated Skills ({data.skillsDemonstrated.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {data.skillsDemonstrated.length > 0 ? (
              data.skillsDemonstrated.map((s) => (
                <span key={s} className="text-[11px] font-semibold bg-purple-100/70 border border-purple-200 text-[#603DF5] px-2 py-0.5 rounded-md">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">None detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Preview if available */}
      {data.screenshotUrl && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Extracted Preview Image
          </span>
          <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36 bg-slate-900/5">
            <img
              src={data.screenshotUrl}
              alt={data.title}
              className="w-full h-36 object-cover object-top"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      {/* Key Features if extracted */}
      {data.keyFeatures && data.keyFeatures.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-200/70">
          <span className="text-[10px] font-bold text-[#0B1B43] uppercase tracking-wider block">
            Extracted Key Features:
          </span>
          <ul className="text-xs text-[#405B8B] space-y-1">
            {data.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Links & Repository Metadata Footer */}
      <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-600 font-bold flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-[#087BFA]" />
            {data.repositoryUrl.replace(/^https?:\/\/github\.com\//, '')}
          </span>
          {data.liveDemoUrl ? (
            <a
              href={data.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#16A34A] hover:underline flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Live Demo Detected</span>
            </a>
          ) : (
            <span className="text-slate-400 italic text-[11px]">No Live Demo URL</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
          {data.stars !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              {data.stars}
            </span>
          )}
          {data.forks !== undefined && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3 text-slate-400" />
              {data.forks}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
