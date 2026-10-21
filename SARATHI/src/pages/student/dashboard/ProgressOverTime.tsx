import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Clock } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import type { ReadinessPoint, AssessmentAttempt } from './chartMappers';

interface ProgressOverTimeProps {
  readinessTrend: ReadinessPoint[];
  assessmentHistory: AssessmentAttempt[];
  hasData: boolean;
  onNavigate: (path: string) => void;
}

export const ProgressOverTime: React.FC<ProgressOverTimeProps> = ({
  readinessTrend,
  assessmentHistory,
  hasData,
  onNavigate,
}) => {
  const latestScore =
    readinessTrend.length > 0 ? readinessTrend[readinessTrend.length - 1].score : 0;
  const firstScore =
    readinessTrend.length > 0 ? readinessTrend[0].score : 0;
  const netChange = latestScore - firstScore;

  const trendCaption =
    !hasData || readinessTrend.length <= 1
      ? 'Initial readiness baseline established for current domain.'
      : `Readiness has improved by ${netChange >= 0 ? `+${netChange}%` : `${netChange}%`} across ${readinessTrend.length} measurement points.`;

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-[#0B1B43] flex items-center gap-2">
            <span>Progress Over Time & Trajectory</span>
            <Badge variant="blue">Visuals 3 & 4</Badge>
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">{trendCaption}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 3: READINESS TREND LINE (Score per assessment/week with target line) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                Readiness Score Trajectory
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Weekly progression vs 85% Target Benchmark
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Target: 85%
            </span>
          </div>

          <div className="h-64 w-full" aria-label="Readiness Trend Line Chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readinessTrend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#8FA1C0' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8FA1C0' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Readiness Score']}
                  contentStyle={{ backgroundColor: '#0B1B43', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                />
                <ReferenceLine y={85} stroke="#603DF5" strokeDasharray="4 4" label={{ value: 'Target 85%', fill: '#603DF5', fontSize: 10, position: 'insideTopRight' }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#087BFA"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#087BFA', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
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
                  <th className="p-1.5">Period</th>
                  <th className="p-1.5">Readiness Score</th>
                  <th className="p-1.5">Target</th>
                </tr>
              </thead>
              <tbody>
                {readinessTrend.map((t) => (
                  <tr key={t.period} className="border-t border-slate-100">
                    <td className="p-1.5 font-bold text-[#0B1B43]">{t.period}</td>
                    <td className="p-1.5">{t.score}%</td>
                    <td className="p-1.5">85%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>

        {/* CHART 4: ASSESSMENT HISTORY (Bar Chart, Score % per attempt) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                Assessment History & Attempt Scores
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Score percentage across diagnostic test attempts
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#603DF5]">
              {assessmentHistory.length} Attempts
            </span>
          </div>

          {assessmentHistory.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-[#0B1B43]">No Assessment Attempts Recorded</p>
                <p className="text-[11px] text-[#405B8B]">Complete an assessment to populate your attempt history.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => onNavigate('/student/assessment')}>
                Take Assessment
              </Button>
            </div>
          ) : (
            <div className="h-64 w-full" aria-label="Assessment History Bar Chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assessmentHistory} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#8FA1C0' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8FA1C0' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Score']}
                    contentStyle={{ backgroundColor: '#0B1B43', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="scorePct" fill="#603DF5" radius={[6, 6, 0, 0]}>
                    {assessmentHistory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.passed ? '#10B981' : '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Text-table fallback (PRD §6) */}
          {assessmentHistory.length > 0 && (
            <details className="text-xs text-[#405B8B] pt-2 border-t border-slate-100 cursor-pointer">
              <summary className="font-semibold hover:text-[#0B1B43] select-none">
                View data table (Accessible Fallback)
              </summary>
              <table className="w-full mt-2 text-left text-[11px] border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-1.5">Attempt</th>
                    <th className="p-1.5">Title</th>
                    <th className="p-1.5">Score</th>
                    <th className="p-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentHistory.map((a) => (
                    <tr key={a.attempt} className="border-t border-slate-100">
                      <td className="p-1.5 font-bold text-[#0B1B43]">#{a.attempt}</td>
                      <td className="p-1.5">{a.title}</td>
                      <td className="p-1.5 font-bold">{a.scorePct}%</td>
                      <td className="p-1.5 text-emerald-600">{a.passed ? 'Passed' : 'Needs Review'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
};
