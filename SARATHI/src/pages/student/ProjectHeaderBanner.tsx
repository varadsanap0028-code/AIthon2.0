import React from 'react';
import { FolderGit2, Plus, GitBranch, Code2, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';

interface ProjectHeaderBannerProps {
  onAddProject: () => void;
  onGithubImport: () => void;
}

export const ProjectHeaderBanner: React.FC<ProjectHeaderBannerProps> = ({
  onAddProject,
  onGithubImport,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E0E7F2] p-6 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-[#087BFA] border border-blue-100">
              <Code2 className="w-3 h-3" />
              Portfolio & Evidence Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Recruiter Verified Proofs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0B1B43] tracking-tight">
                Projects & Proof of Work
              </h1>
              <p className="text-xs sm:text-sm text-[#405B8B] mt-0.5">
                Submit code repositories and live demos to verify your practical skills and build evidence for recruiters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onGithubImport}
            leftIcon={<GitBranch className="w-4 h-4 text-[#087BFA]" />}
            className="text-xs"
          >
            GitHub Import
          </Button>
          <Button
            variant="primary"
            onClick={onAddProject}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs shadow-sm shadow-blue-500/20"
          >
            Add New Project
          </Button>
        </div>
      </div>
    </div>
  );
};
