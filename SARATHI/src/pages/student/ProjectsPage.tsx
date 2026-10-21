import React, { useState, useMemo } from 'react';
import { FolderGit2, Plus, Search } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { ProjectHeaderBanner } from './ProjectHeaderBanner';
import { ProjectKpiRow } from './ProjectKpiRow';
import { GithubStatsBanner } from './GithubStatsBanner';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';
import type { ProjectItem } from '../../types/project';

type FilterTab = 'all' | 'verified' | 'evidence-submitted' | 'self-reported';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { projects, addProject, updateProject, deleteProject } = useStudent();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'title'>('newest');

  // KPI Metrics
  const verifiedCount = useMemo(
    () => projects.filter((p) => p.verificationStatus === 'verified').length,
    [projects]
  );
  const pendingCount = useMemo(
    () => projects.filter((p) => p.verificationStatus === 'evidence-submitted').length,
    [projects]
  );
  const draftCount = useMemo(
    () => projects.filter((p) => p.verificationStatus !== 'verified' && p.verificationStatus !== 'evidence-submitted').length,
    [projects]
  );
  const uniqueSkillsCount = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.skillsDemonstrated.forEach((s) => set.add(s.toLowerCase())));
    return set.size;
  }, [projects]);

  // Language distribution for GitHub summary
  const languageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      p.technologies.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    const colors = ['#087BFA', '#603DF5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count], i) => ({
        name: lang,
        count,
        pct: Math.round((count / total) * 100),
        color: colors[i % colors.length],
      }));
  }, [projects]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((proj) => {
        if (activeTab === 'verified' && proj.verificationStatus !== 'verified') return false;
        if (activeTab === 'evidence-submitted' && proj.verificationStatus !== 'evidence-submitted') return false;
        if (activeTab === 'self-reported' && (proj.verificationStatus === 'verified' || proj.verificationStatus === 'evidence-submitted')) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = proj.title.toLowerCase().includes(q);
          const matchDesc = proj.description.toLowerCase().includes(q);
          const matchTech = proj.technologies.some((t) => t.toLowerCase().includes(q));
          const matchSkills = proj.skillsDemonstrated.some((s) => s.toLowerCase().includes(q));
          return matchTitle || matchDesc || matchTech || matchSkills;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [projects, activeTab, searchQuery, sortBy]);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: ProjectItem) => {
    setEditingProject(proj);
    setIsModalOpen(true);
  };

  const handleSaveProject = (data: {
    title: string;
    description: string;
    technologies: string[];
    repositoryUrl: string;
    liveDemoUrl?: string;
    screenshotUrl?: string;
    skillsDemonstrated: string[];
  }) => {
    if (editingProject) {
      updateProject({
        ...editingProject,
        ...data,
      });
    } else {
      addProject(data);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. SYSTEMATIC HERO HEADER BANNER */}
      <ProjectHeaderBanner
        onAddProject={handleOpenAdd}
        onGithubImport={handleOpenAdd}
      />

      {/* 2. 4-METRIC KPI OVERVIEW ROW */}
      <ProjectKpiRow
        totalCount={projects.length}
        verifiedCount={verifiedCount}
        pendingCount={pendingCount}
        uniqueSkillsCount={uniqueSkillsCount}
      />

      {/* 3. GITHUB DEVELOPER PROFILE BANNER */}
      <GithubStatsBanner
        githubUrl={user?.githubUrl}
        languageDistribution={languageDistribution}
      />

      {/* 4. SYSTEMATIC TOOLBAR (SEARCH + STATUS TABS + SORT) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#E0E7F2] shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-[#087BFA] shadow-xs'
                : 'text-slate-500 hover:text-[#0B1B43]'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'verified'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-[#0B1B43]'
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setActiveTab('evidence-submitted')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'evidence-submitted'
                ? 'bg-white text-[#603DF5] shadow-xs'
                : 'text-slate-500 hover:text-[#0B1B43]'
            }`}
          >
            In Review ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('self-reported')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'self-reported'
                ? 'bg-white text-slate-700 shadow-xs'
                : 'text-slate-500 hover:text-[#0B1B43]'
            }`}
          >
            Drafts ({draftCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tech, skill..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E0E7F2] text-xs text-[#0B1B43] placeholder-slate-400 outline-none focus:border-[#087BFA]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'title')}
            className="px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] text-xs text-slate-600 bg-white font-medium outline-none focus:border-[#087BFA] cursor-pointer"
          >
            <option value="newest">Recently Added</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 5. PROJECTS GRID */}
      {filteredProjects.length === 0 ? (
        <Card className="max-w-xl mx-auto py-8">
          <EmptyState
            icon={<FolderGit2 className="w-8 h-8" />}
            title={projects.length === 0 ? 'No projects added yet' : 'No matching projects found'}
            description={
              projects.length === 0
                ? 'Add your first project to start building evidence of your skills. Code repositories and live demos serve as verifiable proof for recruiters.'
                : 'Try adjusting your search query or switching to the "All" filter tab.'
            }
            variant="blue"
            action={
              projects.length === 0 ? (
                <Button variant="primary" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
                  Add Your First Project
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setSearchQuery(''); setActiveTab('all'); }}>
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              onEdit={handleOpenEdit}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {/* 6. MODAL (EXTRACTED) */}
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProject={editingProject}
        onSave={handleSaveProject}
      />
    </div>
  );
};
