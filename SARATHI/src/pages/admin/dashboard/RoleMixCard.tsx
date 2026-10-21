import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Download } from 'lucide-react';
import { ChartCard, downloadCsv } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface RoleMixCardProps {
  roleMix: OverviewAnalyticsResponse['roleMix'];
}

const ROLE_COLORS: Record<string, string> = {
  student: '#4F46E5',
  recruiter: '#059669',
  college: '#D97706',
  reviewer: '#7C3AED',
  platform_admin: '#374151',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  recruiter: 'Recruiter',
  college: 'College',
  reviewer: 'Reviewer',
  platform_admin: 'Admin',
};

export const RoleMixCard: React.FC<RoleMixCardProps> = ({ roleMix }) => {
  const handleExportCsv = () => {
    downloadCsv('role_mix.csv', roleMix, ['role', 'count']);
  };

  const action = (
    <button
      type="button"
      onClick={handleExportCsv}
      title="Export role mix data to CSV"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors focus:outline-hidden"
    >
      <Download size={13} />
      <span>CSV</span>
    </button>
  );

  const totalUsers = roleMix.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <ChartCard
      title="Role Mix"
      subtitle="Registered accounts distributed across platform roles"
      action={action}
    >
      <div className="flex flex-col justify-between min-h-[260px]">
        {roleMix.length === 0 || totalUsers === 0 ? (
          <div className="h-48 flex items-center justify-center text-[13px] text-[#6B7280]">
            No users registered.
          </div>
        ) : (
          <>
            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleMix}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {roleMix.map((entry) => (
                      <Cell
                        key={entry.role}
                        fill={ROLE_COLORS[entry.role] || '#9CA3AF'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [
                      `${Number(val).toLocaleString()} users (${
                        totalUsers > 0 ? Math.round((Number(val) / totalUsers) * 100) : 0
                      }%)`,
                      ROLE_LABELS[String(name)] || String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E7EB',
                      borderRadius: 6,
                      fontSize: 12,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] font-bold text-[#111827]">{totalUsers.toLocaleString()}</span>
                <span className="text-[11px] text-[#6B7280]">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F3F4F6]">
              {roleMix.map((item) => {
                const pct = totalUsers > 0 ? Math.round((item.count / totalUsers) * 100) : 0;
                return (
                  <div key={item.role} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[item.role] || '#9CA3AF' }}
                      />
                      <span className="text-[#4B5563] truncate">
                        {ROLE_LABELS[item.role] || item.role}
                      </span>
                    </div>
                    <span className="font-semibold text-[#111827] shrink-0 pl-1">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
};

export default RoleMixCard;
