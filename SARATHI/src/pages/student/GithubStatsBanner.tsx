import React from 'react';
import { GitBranch, ExternalLink } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

interface GithubStatsBannerProps {
  githubUrl?: string;
  languageDistribution: {
    name: string;
    count: number;
    pct: number;
    color: string;
  }[];
}

export const GithubStatsBanner: React.FC<GithubStatsBannerProps> = ({
  githubUrl,
  languageDistribution,
}) => {
  return (
    <Card className="p-5 border-[#E0E7F2] bg-gradient-to-r from-slate-900 via-[#0B1B43] to-[#081B3B] text-white shadow-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
            <GitBranch className="w-5 h-5 text-[#087BFA]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white">GitHub Integration & Top Languages</h2>
              <Badge variant="purple">Live Sync</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#087BFA] font-bold inline-flex items-center gap-1"
                >
                  <span>{githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '@')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>Submit repository links below to auto-import languages and build verified evidence.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {languageDistribution.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-300 text-[11px]">Languages Across Repositories</span>
            <div className="flex flex-wrap items-center gap-3">
              {languageDistribution.map((l) => (
                <div key={l.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="font-semibold">{l.name}</span>
                  <span className="text-slate-400">({l.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-white/10 p-0.5">
            {languageDistribution.map((l) => (
              <div
                key={l.name}
                style={{ width: `${l.pct}%`, backgroundColor: l.color }}
                title={`${l.name}: ${l.pct}%`}
                className="h-full rounded-xs transition-all"
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
