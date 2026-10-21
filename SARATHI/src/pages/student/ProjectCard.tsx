import React from 'react';
import { GitBranch, Globe, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import type { ProjectItem } from '../../types/project';

interface ProjectCardProps {
  project: ProjectItem;
  onEdit: (project: ProjectItem) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  return (
    <Card hoverEffect className="p-5 space-y-4 flex flex-col justify-between border-[#E0E7F2]">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-base font-bold text-[#0B1B43] leading-snug">{project.title}</h3>
          <Badge
            variant={
              project.verificationStatus === 'verified'
                ? 'success'
                : project.verificationStatus === 'evidence-submitted'
                ? 'purple'
                : project.verificationStatus === 'rejected'
                ? 'danger'
                : 'blue'
            }
          >
            {project.verificationStatus === 'verified'
              ? 'Verified Credential'
              : project.verificationStatus === 'evidence-submitted'
              ? 'In Review'
              : project.verificationStatus === 'rejected'
              ? 'Needs Revision'
              : 'Draft Evidence'}
          </Badge>
        </div>

        <p className="text-xs text-[#405B8B] leading-relaxed line-clamp-3">{project.description}</p>

        {project.reviewerNote && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5">
            <span className="font-bold text-[#0B1B43] block text-[11px]">Reviewer Feedback:</span>
            <span className="text-[#405B8B] leading-relaxed text-[11px]">{project.reviewerNote}</span>
          </div>
        )}

        {project.screenshotUrl && (
          <div>
            <a
              href={project.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#087BFA] hover:underline font-semibold"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>View Screenshot Preview</span>
            </a>
          </div>
        )}

        {/* Tech stack */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#0B1B43] uppercase tracking-wide">Technologies:</span>
          <div className="flex gap-1.5 flex-wrap">
            {project.technologies.map((tech) => (
              <span key={tech} className="text-[11px] bg-slate-100 text-[#0B1B43] px-2 py-0.5 rounded-md font-semibold">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Demonstrated Skills */}
        {project.skillsDemonstrated.length > 0 && (
          <div className="space-y-1 pt-0.5">
            <span className="text-[10px] font-bold text-[#603DF5] uppercase tracking-wide">Demonstrated Skills:</span>
            <div className="flex gap-1.5 flex-wrap">
              {project.skillsDemonstrated.map((skill) => (
                <span key={skill} className="text-[11px] bg-purple-50 text-[#603DF5] px-2 py-0.5 rounded-md font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-[#E0E7F2] flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#087BFA] hover:underline flex items-center gap-1.5"
          >
            <GitBranch className="w-4 h-4" />
            <span>Open Repo</span>
          </a>

          {project.liveDemoUrl && (
            <a
              href={project.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#16A34A] hover:underline flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4" />
              <span>Live Demo</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 text-slate-400 hover:text-[#087BFA] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Edit Project"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 text-slate-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};
