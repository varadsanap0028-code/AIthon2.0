import React from 'react';
import { Download } from 'lucide-react';
import { ChartCard, downloadCsv } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface FunnelCardProps {
  funnel: OverviewAnalyticsResponse['funnel'];
}

export const FunnelCard: React.FC<FunnelCardProps> = ({ funnel }) => {
  const handleExportCsv = () => {
    downloadCsv('candidate_funnel.csv', funnel, ['step', 'count']);
  };

  const action = (
    <button
      type="button"
      onClick={handleExportCsv}
      title="Export funnel data to CSV"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors focus:outline-hidden"
    >
      <Download size={13} />
      <span>CSV</span>
    </button>
  );

  const maxCount = funnel.length > 0 ? Math.max(...funnel.map((f) => f.count), 1) : 1;

  return (
    <ChartCard
      title="Candidate Funnel"
      subtitle="Conversion rate through core candidate lifecycle"
      action={action}
    >
      <div className="flex flex-col justify-between min-h-[260px] py-1">
        {funnel.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[13px] text-[#6B7280]">
            No funnel data available.
          </div>
        ) : (
          <div className="space-y-3.5">
            {funnel.map((step, index) => {
              const prevCount = index > 0 ? funnel[index - 1].count : step.count;
              const pctOfPrev = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0;
              const barWidth = Math.max(Math.round((step.count / maxCount) * 100), 2);

              return (
                <div key={step.step} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#111827]">{step.step}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#111827]">{step.count.toLocaleString()}</span>
                      <span className="text-[11px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded-[4px]">
                        {index === 0 ? '100%' : `${pctOfPrev}% of prev`}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#F3F4F6] h-[7px] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChartCard>
  );
};

export default FunnelCard;
