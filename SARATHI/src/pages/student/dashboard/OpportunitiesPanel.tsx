import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  ArrowRight,
  Building2,
  MapPin
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import type { FunnelStageItem } from './chartMappers';
import type { DashboardJobMatch } from './useDashboardData';

interface OpportunitiesPanelProps {
  applicationFunnel: FunnelStageItem[];
  topJobMatches: DashboardJobMatch[];
  onNavigate: (path: string) => void;
}

export const OpportunitiesPanel: React.FC<OpportunitiesPanelProps> = ({
  applicationFunnel,
  topJobMatches,
  onNavigate,
}) => {
  const totalApplied = applicationFunnel.reduce((acc, f) => acc + f.count, 0);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B1B43] flex items-center gap-2">
            <span>Career Opportunities & Recruitment Funnel</span>
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">
            Real-time conversion tracking across employer recruitment pipelines and top matched positions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('/student/opportunities')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[#087BFA]" />}
        >
          View All Opportunities
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VISUAL 7: APPLICATION FUNNEL (Horizontal Funnel Bar Chart) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                Application Conversion Funnel
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Applied → Review → Shortlist → Interview → Offer
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#087BFA]">
              {totalApplied} Total Events
            </span>
          </div>

          <div className="h-64 w-full" aria-label="Application Funnel Bar Chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={applicationFunnel}
                layout="vertical"
                margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#8FA1C0' }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: '#0B1B43', fontWeight: 600 }}
                  width={80}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} Applications`, 'Count']}
                  contentStyle={{ backgroundColor: '#0B1B43', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {applicationFunnel.map((_, index) => {
                    const colors = ['#087BFA', '#3B82F6', '#603DF5', '#8B5CF6', '#10B981'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Text-table fallback (PRD §6) */}
          <details className="text-xs text-[#405B8B] pt-2 border-t border-slate-100 cursor-pointer">
            <summary className="font-semibold hover:text-[#0B1B43] select-none">
              View data table (Accessible Fallback)
            </summary>
            <table className="w-full mt-2 text-left text-[11px] border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-1.5">Funnel Stage</th>
                  <th className="p-1.5">Candidate Applications</th>
                </tr>
              </thead>
              <tbody>
                {applicationFunnel.map((f) => (
                  <tr key={f.stage} className="border-t border-slate-100">
                    <td className="p-1.5 font-bold text-[#0B1B43]">{f.stage}</td>
                    <td className="p-1.5">{f.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>

        {/* TOP 3 JOB MATCHES (PRD §4 #7) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                Top Calibrated Job Matches
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Matched against your verified Skill Passport competencies
              </p>
            </div>
            <Badge variant="purple">AI Matched</Badge>
          </div>

          {topJobMatches.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-[#0B1B43]">No Matched Opportunities Yet</p>
                <p className="text-[11px] text-[#405B8B]">Complete your diagnostic assessment to calibrate employer job matches.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('/student/opportunities')}>
                Browse All Openings
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {topJobMatches.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 rounded-2xl bg-white border border-[#E0E7F2] hover:border-[#087BFA] hover:shadow-xs transition-all space-y-2 cursor-pointer"
                  onClick={() => onNavigate('/student/opportunities')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#0B1B43] hover:text-[#087BFA] transition-colors">
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#405B8B] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{job.company}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{job.location}</span>
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#087BFA] border border-blue-200">
                      {job.matchScore}% Match
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-[#405B8B]">
                    <span>{job.salary} • {job.type}</span>
                    <span className="text-[#087BFA] font-bold flex items-center gap-0.5">
                      <span>View Role</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
