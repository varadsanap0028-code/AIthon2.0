import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { getProficiencyLabel } from '../../types/skill';
import type { CuratedResource } from './TopNextActions';

export interface CompetencyCardGap {
  skillName: string;
  category: string;
  requiredProficiency: number;
  currentProficiency: number;
  gapLevel: number;
  gapStatus?: string;
  priority: 'High' | 'Medium' | 'Low';
  priorityRationale?: string;
  recommendedAction?: string;
  evidenceStatus?: string;
  confidence?: string;
  verificationStatus?: string;
  whyItMatters?: string;
}

interface CompetencyCardProps {
  gap: CompetencyCardGap;
  resources: CuratedResource[];
  className?: string;
}

export function getCompetencyEvidenceStatus(gap: {
  currentProficiency: number;
  verificationStatus?: string;
  evidenceStatus?: string;
}) {
  if (gap.currentProficiency === 0) {
    return {
      label: 'Not Assessed',
      variant: 'gray' as const,
      description: 'No diagnostic or practical test taken yet.'
    };
  }

  const vStatus = (gap.verificationStatus || '').toLowerCase();

  if (vStatus === 'verified' || gap.evidenceStatus === 'VERIFIED') {
    return {
      label: 'Independently Verified',
      variant: 'emerald' as const,
      description: 'Multi-source verified through rigorous evaluation.'
    };
  }

  if (vStatus === 'evidence-submitted' || vStatus === 'project-submitted') {
    return {
      label: 'Project Evidence Submitted',
      variant: 'blue' as const,
      description: 'GitHub or portfolio artifact submitted for review.'
    };
  }

  if (vStatus === 'practical_completed') {
    return {
      label: 'Practical Task Completed',
      variant: 'blue' as const,
      description: 'Demonstrated in active coding sandbox or workbench.'
    };
  }

  if (vStatus === 'diagnostic_tested' || vStatus === 'assessment-completed') {
    return {
      label: 'Diagnostic Assessment Completed',
      variant: 'indigo' as const,
      description: 'Demonstrated through diagnostic skill evaluation.'
    };
  }

  if (vStatus === 'self-reported') {
    return {
      label: 'Self-Reported',
      variant: 'amber' as const,
      description: 'Claimed by student; pending diagnostic verification.'
    };
  }

  return {
    label: 'Provisional Level',
    variant: 'blue' as const,
    description: 'Demonstrated proficiency pending complete multi-source verification.'
  };
}

export const CompetencyCard: React.FC<CompetencyCardProps> = ({
  gap,
  resources,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMet = gap.gapLevel === 0 || gap.currentProficiency >= gap.requiredProficiency;
  const isMissing = gap.currentProficiency === 0;

  const reqLabel = getProficiencyLabel(gap.requiredProficiency);
  const currLabel = isMissing ? 'Not Evaluated' : getProficiencyLabel(gap.currentProficiency);
  const evidence = getCompetencyEvidenceStatus(gap);

  // Filter curated resources matching this specific skill
  const matchingResources = (() => {
    const normalized = gap.skillName.toLowerCase();
    return resources
      .filter((r) =>
        (r.skillTags || []).some(
          (tag: string) =>
            tag.toLowerCase().includes(normalized) || normalized.includes(tag.toLowerCase())
        )
      )
      .slice(0, 3);
  })();

  // Progress percentage (current vs required)
  const progressPct = Math.min(
    100,
    Math.round((gap.currentProficiency / gap.requiredProficiency) * 100)
  );

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        isExpanded ? 'border-[#087BFA]/60 shadow-sm' : 'border-[#E0E7F2] hover:border-slate-300'
      } ${className}`}
    >
      {/* Primary Compact Row */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Skill Name, Badges, Next Action */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-[#0B1B43]">
              {gap.skillName}
            </h3>
            <Badge variant="gray" size="xs">{gap.category}</Badge>
            
            {/* Priority Badge */}
            {isMet ? (
              <Badge variant="emerald" size="xs" icon={<CheckCircle2 className="w-3 h-3" />}>
                Benchmark Met
              </Badge>
            ) : gap.priority === 'High' ? (
              <Badge variant="rose" size="xs" icon={<AlertCircle className="w-3 h-3" />}>
                High Priority
              </Badge>
            ) : (
              <Badge variant="amber" size="xs">
                {gap.priority} Priority
              </Badge>
            )}

            {/* Truthful Evidence Status Badge */}
            <Badge variant={evidence.variant} size="xs" dot>
              {evidence.label}
            </Badge>

            {gap.confidence && gap.confidence !== 'NONE' && (
              <span className="text-[10px] font-bold text-slate-400">
                ({gap.confidence} confidence)
              </span>
            )}
          </div>

          {/* Single Recommended Action Snippet */}
          <div className="flex items-center gap-2 text-xs text-[#087BFA] font-medium bg-blue-50/50 px-2.5 py-1.5 rounded-lg border border-blue-100/70">
            <Sparkles className="w-3.5 h-3.5 text-[#087BFA] shrink-0" />
            <span className="truncate">
              <strong>Action: </strong>
              {gap.recommendedAction || (isMet ? 'Goal reached. Continue capstone practice.' : 'Build evidence or take diagnostic assessment.')}
            </span>
          </div>
        </div>

        {/* Right Side: Benchmark Values, Mini Bar, Gap Badge, Expand Button */}
        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          {/* Level Comparison & Progress */}
          <div className="flex flex-col items-start lg:items-end space-y-1 min-w-[140px]">
            <div className="text-xs" title={`Target: Level ${gap.requiredProficiency} (${reqLabel}) • Current: Level ${gap.currentProficiency} (${currLabel})`}>
              <span className="text-slate-400">Target: </span>
              <strong className="text-[#0B1B43]">Lvl {gap.requiredProficiency}</strong>
              <span className="text-slate-400"> • Current: </span>
              <strong className={isMissing ? 'text-slate-400' : isMet ? 'text-emerald-600' : 'text-[#087BFA]'}>
                Lvl {gap.currentProficiency}
              </strong>
            </div>

            <div className="w-28">
              <ProgressBar
                progress={progressPct}
                color={isMet ? 'emerald' : gap.priority === 'High' ? 'amber' : 'blue'}
                size="sm"
              />
            </div>
          </div>

          {/* Gap Badge */}
          <div className="shrink-0">
            {isMet ? (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Met ✓
              </span>
            ) : (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                gap.priority === 'High'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                -{gap.gapLevel} {gap.gapLevel === 1 ? 'Lvl' : 'Lvls'}
              </span>
            )}
          </div>

          {/* Expand Details Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-50 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            aria-expanded={isExpanded}
            aria-label={`Toggle details for ${gap.skillName}`}
          >
            <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Section: Why It Matters, Priority Rationale, Evidence Metadata, Curated Resources */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Why it matters */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="font-extrabold text-[#0B1B43] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087BFA]" />
                Role Relevance
              </span>
              <p className="text-[#405B8B] leading-relaxed">
                {gap.whyItMatters || `Essential competency for mastering the technical challenges of ${gap.category}.`}
              </p>
            </div>

            {/* Priority Rationale & Evidence Details */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="font-extrabold text-[#0B1B43] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Priority Rationale & Verification
              </span>
              <p className="text-[#405B8B] leading-relaxed">
                {gap.priorityRationale || (isMet ? 'Benchmark goal satisfied.' : `Demonstrated skill is ${gap.gapLevel} levels below role standard.`)}
              </p>
              <div className="pt-1 text-[11px] text-slate-500">
                <strong>Status: </strong>{evidence.description}
              </div>
            </div>
          </div>

          {/* Curated Learning Resources */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#0B1B43] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#087BFA]" />
              Curated Learning Modules for {gap.skillName}:
            </span>

            {matchingResources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {matchingResources.map((rec) => (
                  <a
                    key={rec.id}
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-[#087BFA] hover:shadow-xs transition-all flex flex-col justify-between group space-y-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-bold text-[#0B1B43] group-hover:text-[#087BFA] line-clamp-2 leading-tight">
                          {rec.title}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087BFA] shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#405B8B]">
                        <span className="font-semibold text-slate-600">{rec.provider}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">{rec.isFree ? 'Free' : 'Curated'}</span>
                        {rec.level && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{rec.level}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-[#405B8B] flex items-center justify-between">
                <span>
                  No external cataloged resources for {gap.skillName}. Recommended: build hands-on capstone project or review related roadmap milestone.
                </span>
                <span className="text-[11px] font-bold text-[#087BFA] shrink-0 ml-2">
                  Roadmap Milestone Available
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
