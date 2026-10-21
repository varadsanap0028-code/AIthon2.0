import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { DashboardMetrics } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { PageHeader, Card, Badge, EmptyState } from '../../components/common';

export const RecruiterAnalyticsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await recruiterApi.getDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        showToast('Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeOrgId, refreshKey]);

  const totalApps = metrics?.kpiCards?.totalApplicants || 0;
  const verifiedRate = totalApps > 0
    ? Math.round(((metrics?.kpiCards?.skillVerifiedCandidates || 0) / totalApps) * 100)
    : 0;
  const shortlistRate = totalApps > 0
    ? Math.round(((metrics?.kpiCards?.shortlistedCandidates || 0) / totalApps) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Hiring Velocity & Skill Intelligence Analytics"
        description="Objective telemetry on conversion funnels, assessment success rates, and verified candidate yield."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Enterprise Telemetry
          </Badge>
        }
      />

      {/* METRIC GRIDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Candidate Pool</span>
          <span className="text-3xl font-black text-slate-900">{totalApps}</span>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Active talent in pipeline</p>
        </Card>

        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Skill Verification Rate</span>
          <span className="text-3xl font-black text-emerald-600">{verifiedRate}%</span>
          <p className="text-[11px] text-slate-500 mt-1">Profiles backed by code evidence</p>
        </Card>

        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Shortlist Conversion</span>
          <span className="text-3xl font-black text-indigo-600">{shortlistRate}%</span>
          <p className="text-[11px] text-slate-500 mt-1">Applicants meeting required bar</p>
        </Card>

        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Active Technical Jobs</span>
          <span className="text-3xl font-black text-purple-600">{metrics?.kpiCards?.activeJobs || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Multi-domain hiring tracks</p>
        </Card>
      </div>

      {/* FUNNEL BAR BREAKDOWN */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Stage-by-Stage Candidate Conversion</h3>
            <p className="text-xs text-slate-500">Live recruitment funnel conversion progression</p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {metrics?.hiringFunnel?.length || 0} Funnel Stages
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading funnel telemetry...</div>
        ) : (metrics?.hiringFunnel || []).length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No Funnel Data Available"
            description="As applicants advance through pipeline stages, conversion rates and yield telemetry will populate here."
            variant="indigo"
          />
        ) : (
          <div className="space-y-4">
            {(metrics?.hiringFunnel || []).map((step, idx) => {
              const pct = totalApps > 0
                ? Math.min(100, Math.round((step.count / totalApps) * 100))
                : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="capitalize">{step.stage.replace('_', ' ')}</span>
                    <span>{step.count} Candidates ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(step.count > 0 ? 5 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* RECENT RECRUITMENT AUDIT LOG */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">System Audit & Compliance Log</h3>
            <p className="text-xs text-slate-500">Verifiable tamper-evident event stream of recruiter actions</p>
          </div>
          <Badge variant="indigo" size="sm">Audit Trail</Badge>
        </div>

        {(metrics?.recentActivity || []).length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No compliance activities logged yet for this organization session.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {(metrics?.recentActivity || []).map(act => (
              <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                    {act.action}
                  </span>
                  <span className="text-slate-700 font-semibold">{act.actor_name || 'System Operator'}</span>
                  <span className="text-slate-400">on resource {act.resource_type}</span>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0">{new Date(act.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
