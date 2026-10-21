import React, { useState, useEffect } from 'react';
import { GitBranch, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../services/apiClient';
import { ProjectPreviewCard, type ExtractedProjectData } from './ProjectPreviewCard';
import { ProjectOverrideForm } from './ProjectOverrideForm';
import type { ProjectItem } from '../../types/project';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProject: ProjectItem | null;
  onSave: (data: {
    title: string;
    description: string;
    technologies: string[];
    repositoryUrl: string;
    liveDemoUrl?: string;
    screenshotUrl?: string;
    skillsDemonstrated: string[];
  }) => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  editingProject,
  onSave,
}) => {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedProjectData | null>(null);

  // Manual override fields
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [skillsDemonstrated, setSkillsDemonstrated] = useState('');

  useEffect(() => {
    if (editingProject) {
      setRepositoryUrl(editingProject.repositoryUrl);
      setTitle(editingProject.title);
      setDescription(editingProject.description);
      setTechnologies(editingProject.technologies.join(', '));
      setLiveDemoUrl(editingProject.liveDemoUrl || '');
      setScreenshotUrl(editingProject.screenshotUrl || '');
      setSkillsDemonstrated(editingProject.skillsDemonstrated.join(', '));
      setExtractedData({
        title: editingProject.title,
        description: editingProject.description,
        repositoryUrl: editingProject.repositoryUrl,
        liveDemoUrl: editingProject.liveDemoUrl,
        screenshotUrl: editingProject.screenshotUrl,
        technologies: editingProject.technologies,
        skillsDemonstrated: editingProject.skillsDemonstrated,
      });
      setIsEditing(true);
    } else {
      setRepositoryUrl('');
      setTitle('');
      setDescription('');
      setTechnologies('');
      setLiveDemoUrl('');
      setScreenshotUrl('');
      setSkillsDemonstrated('');
      setExtractedData(null);
      setIsEditing(false);
    }
    setError('');
    setIsAnalyzing(false);
  }, [editingProject, isOpen]);

  const handleAnalyzeRepository = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const trimmedUrl = repositoryUrl.trim();
    if (!trimmedUrl) {
      setError('Please enter a GitHub repository URL (e.g. https://github.com/owner/repo)');
      return;
    }

    const GITHUB_REPO_REGEX = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;
    if (!GITHUB_REPO_REGEX.test(trimmedUrl)) {
      setError('Invalid repository URL. Please provide a valid GitHub repo (e.g. https://github.com/owner/repo)');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Connecting to GitHub API & verifying repository...');

    try {
      setTimeout(() => {
        setAnalysisStep('Reading README documentation, package manifests & architecture...');
      }, 500);

      const res = await apiClient.post<{
        success: boolean;
        data: ExtractedProjectData;
      }>('/api/candidates/github/import', { repoUrl: trimmedUrl });

      if (res?.success && res.data) {
        setAnalysisStep('Inferring demonstrated competencies & tech stack...');
        const d = res.data;
        setExtractedData(d);
        setTitle(d.title);
        setDescription(d.description);
        setTechnologies(d.technologies.join(', '));
        setLiveDemoUrl(d.liveDemoUrl || '');
        setScreenshotUrl(d.screenshotUrl || '');
        setSkillsDemonstrated(d.skillsDemonstrated.join(', '));
      }
    } catch (err: any) {
      setError(err.message || 'Could not analyze repository. Ensure the repository is public and accessible.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalTitle = title.trim() || extractedData?.title;
    const finalDesc = description.trim() || extractedData?.description;
    const finalRepo = repositoryUrl.trim();

    if (!finalRepo) {
      setError('GitHub repository URL is required.');
      return;
    }
    if (!finalTitle || !finalDesc) {
      setError('Project information has not been extracted yet. Please click "Analyze Repository" first.');
      return;
    }

    const techArray = technologies
      ? technologies.split(',').map((t) => t.trim()).filter(Boolean)
      : extractedData?.technologies || [];

    const skillsArray = skillsDemonstrated
      ? skillsDemonstrated.split(',').map((s) => s.trim()).filter(Boolean)
      : extractedData?.skillsDemonstrated || [];

    onSave({
      title: finalTitle,
      description: finalDesc,
      technologies: techArray,
      repositoryUrl: finalRepo,
      liveDemoUrl: liveDemoUrl.trim() || undefined,
      screenshotUrl: screenshotUrl.trim() || undefined,
      skillsDemonstrated: skillsArray,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? 'Edit Project Evidence' : 'Submit New Project Evidence'}
      subtitle="Provide your GitHub repository URL. Sarathi will automatically analyze the codebase and extract verified evidence."
    >
      <form onSubmit={handleFinalSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SINGLE INPUT: GITHUB REPOSITORY URL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#0B1B43]">
            GitHub Repository URL *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitBranch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/project-repo"
                disabled={isAnalyzing}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0E7F2] text-xs sm:text-sm text-[#0B1B43] placeholder-slate-400 outline-none focus:border-[#087BFA] focus:ring-2 focus:ring-[#087BFA]/10"
                required
              />
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleAnalyzeRepository()}
              disabled={isAnalyzing || !repositoryUrl.trim()}
              leftIcon={
                isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              className="text-xs px-4 whitespace-nowrap shadow-xs"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
            </Button>
          </div>
          <p className="text-[11px] text-[#405B8B]">
            Paste any public repository link. We'll automatically detect technologies, skills, documentation, and live links.
          </p>
        </div>

        {/* 2. REPOSITORY ANALYSIS PROGRESS STATUS */}
        {isAnalyzing && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-[#087BFA] animate-spin shrink-0" />
            <div className="text-xs text-[#0B1B43]">
              <span className="font-bold block">Analyzing Repository</span>
              <span className="text-[#405B8B] text-[11px]">{analysisStep}</span>
            </div>
          </div>
        )}

        {/* 3. AUTOMATICALLY EXTRACTED PREVIEW CARD */}
        {extractedData && (
          <div className="space-y-3 pt-1">
            <ProjectPreviewCard
              data={extractedData}
              onToggleEdit={() => setIsEditing(!isEditing)}
              isEditing={isEditing}
            />

            {/* Optional Manual Override Section (Collapsible) */}
            {isEditing && (
              <ProjectOverrideForm
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                technologies={technologies}
                setTechnologies={setTechnologies}
                skillsDemonstrated={skillsDemonstrated}
                setSkillsDemonstrated={setSkillsDemonstrated}
                liveDemoUrl={liveDemoUrl}
                setLiveDemoUrl={setLiveDemoUrl}
                screenshotUrl={screenshotUrl}
                setScreenshotUrl={setScreenshotUrl}
              />
            )}
          </div>
        )}

        {/* 4. MODAL FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0E7F2]">
          <Button variant="secondary" onClick={onClose} type="button" className="text-xs">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!extractedData || isAnalyzing}
            className="text-xs shadow-xs"
          >
            {editingProject ? 'Save Changes' : 'Submit Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
