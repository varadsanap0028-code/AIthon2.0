import React from 'react';

interface ProjectOverrideFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  technologies: string;
  setTechnologies: (v: string) => void;
  skillsDemonstrated: string;
  setSkillsDemonstrated: (v: string) => void;
  liveDemoUrl: string;
  setLiveDemoUrl: (v: string) => void;
  screenshotUrl: string;
  setScreenshotUrl: (v: string) => void;
}

export const ProjectOverrideForm: React.FC<ProjectOverrideFormProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  technologies,
  setTechnologies,
  skillsDemonstrated,
  setSkillsDemonstrated,
  liveDemoUrl,
  setLiveDemoUrl,
  screenshotUrl,
  setScreenshotUrl,
}) => {
  return (
    <div className="p-4 rounded-xl border border-[#E0E7F2] bg-white space-y-3 text-xs animate-in fade-in">
      <span className="font-bold text-[#0B1B43] block text-xs">
        Review & Refine Extracted Fields
      </span>
      <div>
        <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Project Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Technologies (comma separated)</label>
          <input
            type="text"
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
            className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Demonstrated Skills (comma separated)</label>
          <input
            type="text"
            value={skillsDemonstrated}
            onChange={(e) => setSkillsDemonstrated(e.target.value)}
            className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Live Demo URL</label>
          <input
            type="url"
            value={liveDemoUrl}
            onChange={(e) => setLiveDemoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#405B8B] mb-1">Screenshot URL</label>
          <input
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="https://..."
            className="w-full p-2 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43]"
          />
        </div>
      </div>
    </div>
  );
};
