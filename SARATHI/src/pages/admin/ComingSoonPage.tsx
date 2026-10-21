import React from 'react';
import { PageHeader } from '../../components/admin/PageHeader';
import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  subtitle: string;
  phase: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, subtitle, phase }) => {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] mb-4">
          <Construction size={24} />
        </div>
        <h2 className="text-[16px] font-semibold text-[#111827]">Feature in Development</h2>
        <p className="text-[14px] text-[#6B7280] max-w-md mt-1 leading-relaxed">
          The <span className="font-medium text-[#111827]">{title}</span> view is scheduled for implementation in{' '}
          <span className="font-semibold text-[#4F46E5]">{phase}</span>.
        </p>
      </div>
    </div>
  );
};

export default ComingSoonPage;
