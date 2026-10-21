import React from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { LearningResource } from './types';

interface ResourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: LearningResource | null;
  onToggleBookmark?: (resource: LearningResource) => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  isOpen,
  onClose,
  resource,
}) => {
  if (!isOpen || !resource) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource.title}
      subtitle={`By ${resource.provider} • ${resource.level} Level`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-[#405B8B] hover:text-[#0B1B43]">
            Close
          </Button>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#603DF5] hover:bg-[#502de4] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Open Learning Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[#405B8B]">
        {resource.thumbnailUrl && (
          <div className="w-full h-36 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2] flex items-center justify-center overflow-hidden relative shadow-2xs">
            {resource.thumbnailUrl.includes('ytimg.com') ? (
              <img
                src={resource.thumbnailUrl}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-4 bg-white rounded-2xl border border-[#E0E7F2] shadow-xs flex items-center justify-center">
                <img
                  src={resource.thumbnailUrl}
                  alt={resource.title}
                  className="w-12 h-12 object-contain"
                />
              </div>
            )}
          </div>
        )}

        {resource.description && (
          <div>
            <h4 className="font-bold text-[#0B1B43] mb-1.5 text-sm">Course Overview</h4>
            <p className="text-[#405B8B] leading-relaxed">{resource.description}</p>
          </div>
        )}

        {resource.learningObjectives && resource.learningObjectives.length > 0 && (
          <div>
            <h4 className="font-bold text-[#0B1B43] mb-2 text-sm">Learning Objectives</h4>
            <ul className="space-y-1.5 pl-0.5">
              {resource.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-[#405B8B]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {resource.prerequisites && resource.prerequisites.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
            <span className="font-bold text-[#0B1B43] block mb-1.5">
              Recommended Prerequisites:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {resource.prerequisites.map((p, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-white border border-[#E0E7F2] text-[#0B1B43] px-2 py-0.5 rounded-md font-medium shadow-2xs"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#E0E7F2] text-[11px] text-[#405B8B]">
          <div>
            <span className="block font-bold text-[#0B1B43]">Duration</span>
            <span>{resource.duration || 'Self-paced'}</span>
          </div>
          <div>
            <span className="block font-bold text-[#0B1B43]">Format</span>
            <span className="capitalize">{resource.resourceType || resource.type}</span>
          </div>
          <div>
            <span className="block font-bold text-[#0B1B43]">Access</span>
            <span>{resource.isFree ? '100% Free' : 'Paid Course'}</span>
          </div>
          <div>
            <span className="block font-bold text-[#0B1B43]">Language</span>
            <span>{resource.language}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
