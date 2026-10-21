import React from 'react';
import { Sparkles, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';

export interface ActionableGapItem {
  skillName: string;
  category: string;
  requiredProficiency: number;
  currentProficiency: number;
  gapLevel: number;
  priority: 'High' | 'Medium' | 'Low';
  priorityRationale?: string;
  recommendedAction?: string;
  evidenceStatus?: string;
  confidence?: string;
  verificationStatus?: string;
  whyItMatters?: string;
}

export interface CuratedResource {
  id: string;
  title: string;
  url: string;
  provider: string;
  isFree?: boolean;
  level?: string;
  type?: string;
  skillTags?: string[];
}

interface TopNextActionsProps {
  skillGaps: ActionableGapItem[];
  resources: CuratedResource[];
  targetRole: string;
  className?: string;
}

export const TopNextActions: React.FC<TopNextActionsProps> = ({
  skillGaps,
  resources,
  targetRole,
  className = ''
}) => {
  const navigate = useNavigate();

  // Find gaps that have not reached target level
  const actionableGaps = skillGaps.filter((g) => g.gapLevel > 0);

  // If student meets all role benchmarks!
  if (actionableGaps.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-emerald-900">
              All Role Benchmarks Met for {targetRole}!
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5 max-w-xl">
              You meet or exceed every required competency for this role. Consider exploring capstone projects to strengthen your portfolio or calibrate for advanced specializations.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/student/passport')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0"
        >
          View Skill Passport
        </Button>
      </div>
    );
  }

  // Priority weight: High (3) > Medium (2) > Low (1)
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };

  // Sort by priority first, then by largest gap level
  const sortedGaps = [...actionableGaps].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return b.gapLevel - a.gapLevel;
  });

  // Top 3 actionable items
  const topThree = sortedGaps.slice(0, 3).map((gap, index) => {
    const normalized = gap.skillName.toLowerCase();
    const matchingResource = resources.find((r) =>
      (r.skillTags || []).some(
        (tag: string) =>
          tag.toLowerCase().includes(normalized) || normalized.includes(tag.toLowerCase())
      )
    );

    let actionHeadline = '';
    let actionDescription = '';
    let ctaText = '';
    let isExternal = false;
    let targetUrl = '';

    if (gap.currentProficiency === 0 || gap.evidenceStatus === 'INSUFFICIENT_EVIDENCE') {
      actionHeadline = `Assess ${gap.skillName}`;
      actionDescription = `Take a diagnostic assessment to verify baseline competency for ${gap.skillName}.`;
      ctaText = 'Start Assessment';
      targetUrl = '/student/assessment';
    } else if (matchingResource) {
      actionHeadline = `Study ${matchingResource.title}`;
      actionDescription = `Master ${gap.skillName} through ${matchingResource.provider} (${matchingResource.isFree ? 'Free' : 'Curated'} ${matchingResource.level || 'Intermediate'} module).`;
      ctaText = 'Open Module';
      isExternal = true;
      targetUrl = matchingResource.url;
    } else if (gap.gapLevel >= 2) {
      actionHeadline = `Complete Roadmap Milestone for ${gap.skillName}`;
      actionDescription = `Follow the guided sequence to close this ${gap.gapLevel}-level competency gap.`;
      ctaText = 'View Roadmap';
      targetUrl = '/student/roadmap';
    } else {
      actionHeadline = `Submit Project Evidence for ${gap.skillName}`;
      actionDescription = `Build or link a repository project demonstrating Level ${gap.requiredProficiency} proficiency.`;
      ctaText = 'Add Project Evidence';
      targetUrl = '/student/projects';
    }

    return {
      rank: index + 1,
      gap,
      matchingResource,
      actionHeadline,
      actionDescription,
      ctaText,
      isExternal,
      targetUrl
    };
  });

  const rankBadges = [
    { label: '#1 Urgent Priority', variant: 'rose' as const },
    { label: '#2 Priority Gap', variant: 'amber' as const },
    { label: '#3 Recommended Step', variant: 'blue' as const }
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#087BFA]" />
          <h2 className="text-base font-extrabold text-[#0B1B43]">
            Top 3 High-Impact Next Actions
          </h2>
        </div>
        <span className="text-xs text-[#405B8B]">
          Prioritized by dependency blockers and role benchmark impact
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {topThree.map((item, idx) => (
          <div
            key={item.gap.skillName}
            className="p-4 rounded-2xl bg-white border border-[#E0E7F2] hover:border-[#087BFA]/40 shadow-xs flex flex-col justify-between space-y-3 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <Badge variant={rankBadges[idx]?.variant || 'blue'} size="xs">
                  {rankBadges[idx]?.label || `#${item.rank}`}
                </Badge>
                <span className="text-[11px] font-bold text-slate-500">
                  Gap: -{item.gap.gapLevel} {item.gap.gapLevel === 1 ? 'Lvl' : 'Lvls'}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-[#0B1B43] flex items-center justify-between">
                  <span>{item.gap.skillName}</span>
                </h3>
                <span className="text-[11px] text-[#405B8B] block mt-0.5">
                  Lvl {item.gap.currentProficiency} demonstrated → Lvl {item.gap.requiredProficiency} required
                </span>
              </div>

              <p className="text-xs text-[#405B8B] line-clamp-2 leading-relaxed">
                {item.actionDescription}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {item.matchingResource ? (
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                  {item.matchingResource.provider}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 capitalize">
                  {item.gap.category}
                </span>
              )}

              {item.isExternal ? (
                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087BFA] hover:text-[#0662c7] transition-colors"
                >
                  <span>{item.ctaText}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={() => navigate(item.targetUrl)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#087BFA] hover:text-[#0662c7] transition-colors cursor-pointer"
                >
                  <span>{item.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
