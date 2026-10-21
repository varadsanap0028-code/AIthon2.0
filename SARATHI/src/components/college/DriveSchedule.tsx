import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import type { CollegePlacementDrive, DriveStatus } from '../../types/college';

import { EligibleStudentsModal } from './EligibleStudentsModal';

interface DriveScheduleProps {
  drives: CollegePlacementDrive[];
  isLoading: boolean;
  onViewEligible?: (driveId: string) => void;
}

const TABS: Array<{ id: DriveStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

export const DriveSchedule: React.FC<DriveScheduleProps> = ({ drives, isLoading, onViewEligible }) => {
  const [tab, setTab] = useState<DriveStatus | 'all'>('all');
  const [selectedDrive, setSelectedDrive] = useState<CollegePlacementDrive | null>(null);

  const visible = drives.filter((d) => tab === 'all' || d.status === tab);

  if (isLoading) return <SkeletonCard />;

  const handleOpenEligible = (drive: CollegePlacementDrive) => {
    setSelectedDrive(drive);
    onViewEligible?.(drive.id);
  };

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0B1B43]">Campus Placement Drives</h3>
            <p className="text-xs text-[#405B8B]">Company, role, package, eligibility criteria and applications</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold" role="tablist" aria-label="Drive status filter">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                  tab === t.id
                    ? 'bg-white text-[#0B1B43] shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState title="No drives in this tab" description="Drives will appear here once scheduled." />
        ) : (
          <div className="space-y-3">
            {visible.map((drive) => (
              <div key={drive.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] flex flex-col sm:flex-row sm:items-center gap-3 justify-between hover:border-blue-200 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-[#0B1B43]">{drive.company}</span>
                    <Badge variant={drive.status === 'completed' ? 'success' : drive.status === 'in_progress' ? 'blue' : 'warning'} size="xs">
                      {drive.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50">
                      ₹{drive.packageLpa} LPA
                    </span>
                  </div>
                  <p className="text-xs text-[#405B8B]">{drive.role} {drive.startDate ? `· Starts ${drive.startDate}` : ''}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#405B8B] pt-0.5">
                    <span>Eligible: <strong className="text-[#0B1B43]">{drive.eligibleStudents || 120}</strong></span>
                    <span>Applied: <strong className="text-[#0B1B43]">{drive.applications}</strong></span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs shrink-0 self-start sm:self-center" onClick={() => handleOpenEligible(drive)}>
                  View Eligible Students
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EligibleStudentsModal
        isOpen={Boolean(selectedDrive)}
        onClose={() => setSelectedDrive(null)}
        driveId={selectedDrive?.id ?? null}
        companyName={selectedDrive?.company}
        roleTitle={selectedDrive?.role}
      />
    </>
  );
};
