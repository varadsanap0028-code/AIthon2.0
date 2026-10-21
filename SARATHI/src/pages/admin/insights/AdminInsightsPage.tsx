/**
 * SARATHI Admin Portal — Platform Analytics & Cross-Domain Insights Page
 * PRD Phase 8
 * 6 Tabs: Forecast, Unusual Days, Recruiter Trust, Skill Gap, Funnel, Relationships
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Filter,
  Info,
  ChevronRight,
  X,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ScatterChart,
  Scatter,
} from 'recharts';
import { adminApi, useAdminQuery } from '../../../services/adminApi';

type TabKey = 'forecast' | 'anomalies' | 'trust' | 'skills' | 'funnel' | 'correlations';

export const AdminInsightsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('forecast');

  // Forecast state
  const [forecastMetric, setForecastMetric] = useState<string>('applications');
  const [forecastHorizon, setForecastHorizon] = useState<number>(14);

  // Anomalies state
  const [anomalyDays, setAnomalyDays] = useState<number>(60);

  // Recruiter trust drawer state
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

  // Correlation relationship selector
  const [selectedRelIdx, setSelectedRelIdx] = useState<number>(0);

  // Queries
  const { data: forecastData, loading: forecastLoading } = useAdminQuery<any>(
    () => adminApi.getForecast(forecastMetric, forecastHorizon),
    [forecastMetric, forecastHorizon]
  );

  const { data: anomalyData, loading: anomalyLoading } = useAdminQuery<any>(
    () => adminApi.getAnomalies(anomalyDays),
    [anomalyDays]
  );

  const { data: trustData, loading: trustLoading } = useAdminQuery<any>(
    () => adminApi.getRecruiterTrust(),
    []
  );

  const { data: skillGapData, loading: skillGapLoading } = useAdminQuery<any>(
    () => adminApi.getSkillGapMarket(),
    []
  );

  const { data: funnelData, loading: funnelLoading } = useAdminQuery<any>(
    () => adminApi.getFunnelCohorts(8),
    []
  );

  const { data: correlationData, loading: correlationLoading } = useAdminQuery<any>(
    () => adminApi.getCorrelations(),
    []
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Platform Analytics & Insights</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 8 • Explainable Stats
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Statistical forecasting, anomaly detection, recruiter trust scoring, and cross-domain market indicators.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-1">
        {[
          { key: 'forecast', label: 'Forecast', icon: TrendingUp },
          { key: 'anomalies', label: 'Unusual Days', icon: AlertTriangle, count: anomalyData?.flaggedCount },
          { key: 'trust', label: 'Recruiter Trust', icon: ShieldCheck },
          { key: 'skills', label: 'Skill Gap Market', icon: Zap },
          { key: 'funnel', label: 'Conversion Funnel', icon: Filter },
          { key: 'correlations', label: 'Relationships', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================== TAB 1: FORECAST ===================== */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700">Metric:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'applications', label: 'Job Applications' },
                  { id: 'signups', label: 'Student Signups' },
                  { id: 'tests', label: 'Assessments Started' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setForecastMetric(m.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      forecastMetric === m.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700">Horizon:</span>
              <div className="flex gap-1.5">
                {[7, 14, 30].map((h) => (
                  <button
                    key={h}
                    onClick={() => setForecastHorizon(h)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      forecastHorizon === h
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {h} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Card & Formula Explainer */}
          {forecastData?.model && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 block">Growth Trend</span>
                <span className="text-xl font-bold text-gray-900">
                  {forecastData.model.slope > 0 ? `+${forecastData.model.slope}` : forecastData.model.slope} / day
                </span>
                <span className="text-[11px] text-gray-400">OLS Regression Slope</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 block">Model Fit (R²)</span>
                <span className="text-xl font-bold text-gray-900">{forecastData.model.r2}</span>
                <span className="text-[11px] text-gray-400">Variance explained</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 block">Historical Points</span>
                <span className="text-xl font-bold text-gray-900">{forecastData.model.n} days</span>
                <span className="text-[11px] text-gray-400">7-day smoothed series</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 block">Confidence Level</span>
                  <span
                    className={`text-sm font-bold uppercase ${
                      forecastData.confidence === 'high' ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {forecastData.confidence} Confidence
                  </span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    forecastData.confidence === 'high' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>
          )}

          {forecastData?.confidence === 'low' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Low confidence alert: Model R² is below 0.20 or data points &lt; 30. Predictions have wide uncertainty bands.
              </span>
            </div>
          )}

          {/* Forecast Chart */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {forecastMetric.toUpperCase()} — 90-Day History & {forecastHorizon}-Day Projection
                </h2>
                <span className="text-xs text-gray-400">
                  Solid blue: smoothed actuals • Purple: fitted regression • Green: forecast with 95% prediction interval
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Info className="w-3.5 h-3.5" />
                <span>Formula: ŷ ± 1.96 · s_e · √(1 + 1/n + (x - x̄)² / S_xx)</span>
              </div>
            </div>

            {forecastLoading ? (
              <div className="h-72 flex items-center justify-center text-xs text-gray-400">Loading forecast...</div>
            ) : forecastData?.insufficientData ? (
              <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Info className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">Insufficient Data for Forecasting</span>
                <span className="text-xs text-gray-500 max-w-sm mt-1">
                  At least 5 active daily points are required over the trailing 90 days to calibrate the regression model.
                </span>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={[
                      ...(forecastData?.fitted?.map((d: any) => ({
                        date: d.date.slice(5),
                        actual: d.actual,
                        smoothed: d.smoothed,
                        fitted: d.fitted,
                      })) || []),
                      ...(forecastData?.forecast?.map((d: any) => ({
                        date: d.date.slice(5),
                        forecast: d.value,
                        lower: d.lower,
                        upper: d.upper,
                      })) || []),
                    ]}
                    margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    {/* Prediction band */}
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#10B981" fillOpacity={0.15} name="Upper 95% Bound" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#FFFFFF" fillOpacity={1} name="Lower 95% Bound" />
                    {/* Actual history */}
                    <Line type="monotone" dataKey="smoothed" stroke="#4F46E5" strokeWidth={2} dot={false} name="7-Day Avg" />
                    {/* Fitted trend */}
                    <Line type="monotone" dataKey="fitted" stroke="#8B5CF6" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Fitted OLS" />
                    {/* Projected forecast */}
                    <Line type="monotone" dataKey="forecast" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} name="Projected" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: UNUSUAL DAYS ===================== */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Statistical Anomaly Detector</h2>
              <span className="text-xs text-gray-500">
                Evaluating trailing 28-day baseline with Modified Z-Score: 0.6745 · (x - median) / MAD. Flagged when |mz| &gt; 3.5.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Lookback:</span>
              <select
                value={anomalyDays}
                onChange={(e) => setAnomalyDays(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
          </div>

          {anomalyLoading ? (
            <div className="text-center py-12 text-xs text-gray-400">Scanning anomaly series...</div>
          ) : (
            <div className="space-y-4">
              {/* Flagged Anomalies Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    Flagged Anomalies ({anomalyData?.flagged?.length || 0})
                  </span>
                </div>
                {anomalyData?.flagged?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No statistically significant anomalies (|mz| &gt; 3.5) detected in the last {anomalyDays} days.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Metric</th>
                          <th className="py-2.5 px-4">Observed Value</th>
                          <th className="py-2.5 px-4">Trailing Median</th>
                          <th className="py-2.5 px-4">Modified Z-Score</th>
                          <th className="py-2.5 px-4">Direction</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {anomalyData?.flagged?.map((f: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2.5 px-4 font-medium text-gray-900">{f.date}</td>
                            <td className="py-2.5 px-4 capitalize font-semibold text-gray-700">
                              {f.metric.replace('_', ' ')}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-gray-900">{f.value}</td>
                            <td className="py-2.5 px-4 text-gray-500">{f.expected}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-red-50 text-red-700 border border-red-200">
                                {f.mz}σ
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  f.direction === 'spike' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {f.direction}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Link
                                to={f.investigateUrl}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
                              >
                                Investigate <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: RECRUITER TRUST ===================== */}
      {activeTab === 'trust' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Recruiter Organization Trust Scores (0-100)</h2>
              <span className="text-xs text-gray-500">
                Weighted composite score: Approval status (35) + Domain verified (10) + Account age (10) + Job descriptions (10) + Hiring velocity (15) + Reasoned rejections (10) + Support record (10).
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Trusted (≥75)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Watch (45-74)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Risky (&lt;45)
              </span>
            </div>
          </div>

          {trustLoading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading recruiter trust data...</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4">Company Name</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Trust Score</th>
                    <th className="py-2.5 px-4">Trust Band</th>
                    <th className="py-2.5 px-4">Component Breakdown</th>
                    <th className="py-2.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trustData?.companies?.map((c: any) => (
                    <tr
                      key={c.orgId}
                      onClick={() => setSelectedCompany(c)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{c.name}</td>
                      <td className="py-2.5 px-4 capitalize text-gray-600">{c.verificationStatus}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 w-7">{c.score}</span>
                          <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                c.band === 'Trusted'
                                  ? 'bg-emerald-500'
                                  : c.band === 'Watch'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${c.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.band === 'Trusted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.band === 'Watch'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {c.band}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                        Approval: {c.components.approvalStatus.score}/35 • Domain: {c.components.corporateEmail.score}/10 • Velocity: {c.components.hiringVelocity.score}/15
                      </td>
                      <td className="py-2.5 px-4 text-right text-indigo-600 font-semibold">
                        View &rarr;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Drawer for Selected Company */}
          {selectedCompany && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
              <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-gray-900">{selectedCompany.name}</h3>
                    <span className="text-xs text-gray-400">Recruiter Trust Assessment</span>
                  </div>
                  <button
                    onClick={() => setSelectedCompany(null)}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 block">Overall Trust Score</span>
                      <span className="text-2xl font-black text-gray-900">{selectedCompany.score} / 100</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        selectedCompany.band === 'Trusted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedCompany.band === 'Watch'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedCompany.band}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Itemized Breakdown</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedCompany.components).map(([k, val]: [string, any]) => (
                      <div key={k} className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-gray-800 capitalize">
                            {k.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="font-bold text-gray-900">
                            {val.score} / {val.max} pts
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full"
                            style={{ width: `${(val.score / val.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t flex gap-2">
                    <Link
                      to="/admin/approvals"
                      className="flex-1 text-center py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                    >
                      Open Verification
                    </Link>
                    <Link
                      to="/admin/users"
                      className="flex-1 text-center py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200"
                    >
                      View Recruiter Users
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 4: SKILL GAP MARKET ===================== */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Market Skill Gap Index ([-1, 1])</h2>
              <span className="text-xs text-gray-500">
                Gap Index = (Demand Share - Supply Share) / max(Demand, Supply). Positive = Under-supplied in market (employers need more). Negative = Over-supplied.
              </span>
            </div>
          </div>

          {skillGapLoading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading skill gap market analytics...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Under-supplied */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-gray-900">Top Under-Supplied Skills (High Demand)</span>
                  </div>
                  <span className="text-[11px] text-gray-400">Employer Shortage</span>
                </div>

                <div className="space-y-2">
                  {skillGapData?.topUnderSupplied?.map((s: any) => (
                    <div key={s.skillId} className="p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900">{s.skillName}</span>
                        <span className="font-mono font-bold text-red-700">+{s.gapIndex}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>
                          Demand: {s.demandShare}% ({s.jobCount} jobs) • Supply: {s.supplyShare}% ({s.candidateCount} students)
                        </span>
                        <span className="text-indigo-600 font-medium">
                          {s.existingResources} courses available
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Over-supplied */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-gray-900">Top Over-Supplied Skills (Market Saturation)</span>
                  </div>
                  <span className="text-[11px] text-gray-400">High Candidate Volume</span>
                </div>

                <div className="space-y-2">
                  {skillGapData?.topOverSupplied?.map((s: any) => (
                    <div key={s.skillId} className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900">{s.skillName}</span>
                        <span className="font-mono font-bold text-blue-700">{s.gapIndex}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>
                          Demand: {s.demandShare}% ({s.jobCount} jobs) • Supply: {s.supplyShare}% ({s.candidateCount} students)
                        </span>
                        <span className="text-gray-400 font-medium">
                          {s.existingResources} courses available
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 5: FUNNEL COHORTS ===================== */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">14-Day Milestone Conversion Funnel</h2>
            <span className="text-xs text-gray-500">
              Proportion of signups reaching platform milestones within 14 days of account registration, with Wilson 95% confidence intervals.
            </span>
          </div>

          {funnelLoading ? (
            <div className="text-center py-12 text-xs text-gray-400">Computing funnel cohorts...</div>
          ) : (
            <div className="space-y-6">
              {/* Overall Funnel Bars */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <span className="text-xs font-bold text-gray-900 block">Platform-Wide Funnel Progression</span>
                <div className="space-y-3">
                  {funnelData?.overallFunnel?.map((step: any, idx: number) => {
                    const pct = Math.round(step.center * 100);
                    const lowerPct = Math.round(step.lower * 100);
                    const upperPct = Math.round(step.upper * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-gray-800">{step.step}</span>
                          <span className="font-bold text-gray-900">
                            {step.count} ({pct}% • 95% CI: [{lowerPct}%, {upperPct}%])
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Cohort Heatmap */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-900">Weekly Signup Cohorts</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Cohort Week</th>
                        <th className="py-2.5 px-4">Signups</th>
                        <th className="py-2.5 px-4">Profile Done</th>
                        <th className="py-2.5 px-4">Test Started</th>
                        <th className="py-2.5 px-4">Test Passed</th>
                        <th className="py-2.5 px-4">Passport Pub.</th>
                        <th className="py-2.5 px-4">First App</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {funnelData?.cohorts?.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4 font-semibold text-gray-900">{c.weekLabel}</td>
                          <td className="py-2.5 px-4 font-bold text-indigo-600">{c.signups}</td>
                          <td className="py-2.5 px-4">{c.rates.profile}%</td>
                          <td className="py-2.5 px-4">{c.rates.test}%</td>
                          <td className="py-2.5 px-4">{c.rates.pass}%</td>
                          <td className="py-2.5 px-4">{c.rates.passport}%</td>
                          <td className="py-2.5 px-4">{c.rates.app}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 6: RELATIONSHIPS ===================== */}
      {activeTab === 'correlations' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Cross-Domain Pearson Correlations</h2>
              <span className="text-xs text-gray-500">
                {correlationData?.disclaimer || 'Correlation indicates statistical association and does NOT imply causation.'}
              </span>
            </div>
          </div>

          {correlationLoading ? (
            <div className="text-center py-12 text-xs text-gray-400">Computing correlations...</div>
          ) : (
            <div className="space-y-4">
              {/* Relationship Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {correlationData?.relationships?.map((rel: any, idx: number) => {
                  const isSelected = selectedRelIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedRelIdx(idx)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-800 line-clamp-1 block">{rel.title}</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900">r = {rel.r}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            rel.strength === 'strong'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rel.strength === 'moderate'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rel.strength}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 block mt-1">
                        p = {rel.p} • n = {rel.n} pairs
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Scatter Plot for Selected Relationship */}
              {correlationData?.relationships?.[selectedRelIdx] && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {correlationData.relationships[selectedRelIdx].title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {correlationData.relationships[selectedRelIdx].description}
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-gray-50 border rounded-lg text-xs font-mono font-bold text-gray-700">
                      Sample: {correlationData.relationships[selectedRelIdx].sample.length} data points
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={correlationData.relationships[selectedRelIdx].xLabel}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={correlationData.relationships[selectedRelIdx].yLabel}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter
                          name="Sample Observations"
                          data={correlationData.relationships[selectedRelIdx].sample}
                          fill="#4F46E5"
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminInsightsPage;
