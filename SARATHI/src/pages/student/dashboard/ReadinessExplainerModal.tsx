import React from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';

interface ReadinessExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: string | null;
  assessedSkillsCount: number;
  verifiedProjectsCount: number;
}

export const ReadinessExplainerModal: React.FC<ReadinessExplainerModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  assessedSkillsCount,
  verifiedProjectsCount
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Understanding Your Career Readiness Score"
      subtitle="Transparent, explainable criteria calibrated for hiring managers and recruiters."
    >
      <div className="space-y-4 text-xs text-[#405B8B]">
        <p className="leading-relaxed">
          Unlike traditional platforms that rely on self-reported endorsements, your SARATHI Career Readiness Score is calculated from three verifiable pillars:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-1">
            <span className="font-black text-[#603DF5] text-sm">45% Weight</span>
            <h5 className="font-bold text-[#0B1B43]">Diagnostic Depth</h5>
            <p className="text-[11px]">Evaluated technical scores in timed, objective assessments.</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
            <span className="font-black text-[#087BFA] text-sm">30% Weight</span>
            <h5 className="font-bold text-[#0B1B43]">Benchmark Coverage</h5>
            <p className="text-[11px]">Ratio of target role required skills evaluated at Level 3+.</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
            <span className="font-black text-[#16A34A] text-sm">25% Weight</span>
            <h5 className="font-bold text-[#0B1B43]">Project Proof</h5>
            <p className="text-[11px]">Peer-reviewed Git repository code artifacts and commit history.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="font-bold text-[#0B1B43]">Current Candidate Profile:</span>
          <p className="text-[11px]">
            Target Role: <strong className="text-[#0B1B43]">{targetRole || 'Not selected'}</strong> •
            Assessed Skills: <strong className="text-[#0B1B43]">{assessedSkillsCount}</strong> •
            Verified Projects: <strong className="text-[#0B1B43]">{verifiedProjectsCount}</strong>
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
};
