import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Download,
  Search,
  BarChart3,
  PieChart as PieIcon,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  adminApi,
  useAdminQuery,
  type IntegrityStatsResponse,
} from '../../../services/adminApi';
import { IntegrityDetailDrawer } from './IntegrityDetailDrawer';
import { IntegrityScoreModelModal } from './IntegrityScoreModelModal';
import { downloadCsv } from '../../../components/admin';

const BAND_COLORS = {
  high: '#DC2626', // Red
  medium: '#D97706', // Amber
  low: '#16A34A', // Emerald
};

export const AdminIntegrityPage: React.FC = () => {
  // Query filters
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Modals & drawers
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch stats
  const {
    data: stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useAdminQuery<IntegrityStatsResponse>((signal) => adminApi.getIntegrityStats(signal), []);

  // Fetch paginated sessions
  const {
    data: sessionsData,
    loading: sessionsLoading,
    refetch: refetchSessions,
  } = useAdminQuery(
    (signal) =>
      adminApi.getIntegritySessions(
        {
          band: bandFilter,
          reviewStatus: statusFilter,
          dateRange,
          q: debouncedSearch,
          page,
          pageSize,
        },
        signal
      ),
    [bandFilter, statusFilter, dateRange, debouncedSearch, page]
  );

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchSessions()]);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedSessionId(id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSessionId(null);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!sessionsData?.sessions || sessionsData.sessions.length === 0) return;
    const rows = sessionsData.sessions.map((s) => ({
      sessionId: s.id,
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
      domain: s.domainId,
      role: s.role,
      riskScore: s.score,
      riskBand: s.band,
      reviewStatus: s.reviewStatus,
      submittedAt: s.submittedAt,
    }));
    downloadCsv(`integrity-sessions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  // Donut chart data for band distribution
  const bandChartData = useMemo(() => {
    if (!stats?.bandDistribution) return [];
    return [
      { name: 'High Risk', value: stats.bandDistribution.high || 0, color: BAND_COLORS.high },
      { name: 'Medium Risk', value: stats.bandDistribution.medium || 0, color: BAND_COLORS.medium },
      { name: 'Low Risk', value: stats.bandDistribution.low || 0, color: BAND_COLORS.low },
    ].filter((item) => item.value > 0);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <span>Test Integrity & Anti-Cheat Review</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Explainable anti-cheat risk scoring, automated copycat shingling, and human proctoring audit workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModelModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>How Score Works</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!sessionsData?.sessions?.length}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            title="Refresh integrity data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Stats Strip with KPI Cards & Compact Charts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Unreviewed High-Risk */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unreviewed High Risk</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-600">
              {statsLoading ? '--' : stats?.unreviewedHighRisk ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sessions flagged &ge; 65 risk awaiting review</p>
        </div>

        {/* KPI 2: Overall Flag Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Flag Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {statsLoading ? '--' : `${stats?.flagRatePct ?? 0}%`}
            </span>
            <span className="text-[11px] text-slate-500">
              of {stats?.totalGraded ?? 0} graded sessions
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total high-risk anomaly incidents</p>
        </div>

        {/* Compact Chart 1: Flags per day (14 days) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Flags / Day (14d)</span>
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="h-16 w-full">
            {stats?.flagsPerDay ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.flagsPerDay}>
                  <Tooltip
                    contentStyle={{ fontSize: 10, borderRadius: 8, padding: 4 }}
                    formatter={(val) => [`${val} flags`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400">Loading...</div>
            )}
          </div>
        </div>

        {/* Compact Chart 2: Band distribution donut */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Risk Bands Mix</span>
            <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="h-16 w-full flex items-center justify-between">
            <div className="w-16 h-16">
              {bandChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bandChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={16}
                      outerRadius={26}
                      paddingAngle={3}
                    >
                      {bandChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-400">--</div>
              )}
            </div>

            <div className="text-[10px] space-y-0.5 text-slate-600 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>High: {stats?.bandDistribution?.high || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Med: {stats?.bandDistribution?.medium || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Low: {stats?.bandDistribution?.low || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, email, or session ID..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
            />
          </div>

          {/* Quick Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Band */}
            <select
              value={bandFilter}
              onChange={(e) => {
                setBandFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Risk Bands</option>
              <option value="high">High Risk (&ge;65)</option>
              <option value="medium">Medium Risk (35–64)</option>
              <option value="low">Low Risk (&lt;35)</option>
            </select>

            {/* Review Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Review Statuses</option>
              <option value="unreviewed">Unreviewed Only</option>
              <option value="clean">Clean (No Concern)</option>
              <option value="violation">Violation Confirmed</option>
              <option value="escalated">Escalated / Needs Follow-up</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Dates</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            {(bandFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setBandFilter('all');
                  setStatusFilter('all');
                  setDateRange('all');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Sessions Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Risk Score</th>
                <th className="px-4 py-3.5">Band</th>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Assessment Domain</th>
                <th className="px-4 py-3.5">Primary Indicators</th>
                <th className="px-4 py-3.5">Submitted</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading assessment integrity records...</span>
                    </div>
                  </td>
                </tr>
              ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No assessment sessions match your current filter criteria.
                  </td>
                </tr>
              ) : (
                sessionsData.sessions.map((session) => {
                  const bandPill = {
                    high: 'bg-red-50 text-red-700 border-red-200',
                    medium: 'bg-amber-50 text-amber-700 border-amber-200',
                    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  }[session.band];

                  const statusPill = {
                    unreviewed: 'bg-slate-100 text-slate-700 border-slate-200',
                    clean: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    violation: 'bg-red-50 text-red-700 border-red-200',
                    escalated: 'bg-purple-50 text-purple-700 border-purple-200',
                  }[session.reviewStatus];

                  const scoreBarColor = session.score >= 65 ? 'bg-red-600' : session.score >= 35 ? 'bg-amber-500' : 'bg-emerald-600';

                  return (
                    <tr
                      key={session.id}
                      onClick={() => handleOpenDetail(session.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Risk Meter */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold font-mono text-sm text-slate-900 w-7 text-right">
                            {session.score}
                          </span>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${scoreBarColor} rounded-full`}
                              style={{ width: `${Math.max(8, session.score)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Band */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${bandPill}`}>
                          {session.band}
                        </span>
                      </td>

                      {/* Candidate */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {session.candidateName}
                        </div>
                        <div className="text-[11px] text-slate-500">{session.candidateEmail}</div>
                      </td>

                      {/* Assessment Domain */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{session.role || 'Assessment'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{session.domainId}</div>
                      </td>

                      {/* Primary Indicators */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="truncate text-slate-600 text-[11px]">
                          {session.reasons?.[0] || 'Clean progress recorded'}
                        </div>
                      </td>

                      {/* Submitted */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : '--'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusPill}`}>
                          {session.reviewStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(session.id);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sessionsData && sessionsData.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-900">{sessionsData.page}</strong> of{' '}
              <strong className="text-slate-900">{sessionsData.totalPages}</strong> ({sessionsData.total} items)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(sessionsData.totalPages, p + 1))}
                disabled={page >= sessionsData.totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detail & Diff Inspection Drawer */}
      <IntegrityDetailDrawer
        sessionId={selectedSessionId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onDecisionSubmitted={handleRefresh}
        onOpenModelHelp={() => setIsModelModalOpen(true)}
      />

      {/* 6. Score Model Architecture Help Modal */}
      <IntegrityScoreModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
      />
    </div>
  );
};

export default AdminIntegrityPage;
