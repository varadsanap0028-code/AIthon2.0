import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StatusDot, EmptyState } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface AttentionCardProps {
  attention: OverviewAnalyticsResponse['attention'];
}

export const AttentionCard: React.FC<AttentionCardProps> = ({ attention }) => {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">Needs your attention</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Pending queues and integrity anomalies requiring administrator intervention
          </p>
        </div>
        {attention.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] rounded-full">
            {attention.reduce((sum, item) => sum + item.count, 0)} total
          </span>
        )}
      </div>

      {attention.length === 0 ? (
        <EmptyState
          message="All caught up. No urgent items require your attention right now."
          className="py-6"
        />
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {attention.map((item) => (
            <div
              key={item.id}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <StatusDot
                  status={item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'}
                  label=""
                />
                <span className="text-[14px] font-medium text-[#111827]">{item.title}</span>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[13px] font-semibold text-[#111827] bg-[#F9FAFB] px-2.5 py-1 rounded-[4px] border border-[#E5E7EB]">
                  {item.count.toLocaleString()} pending
                </span>
                <Link
                  to={item.href}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline"
                >
                  <span>Review</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttentionCard;
