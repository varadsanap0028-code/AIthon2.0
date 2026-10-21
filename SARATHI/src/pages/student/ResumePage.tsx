import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Mail,
  MapPin,
  GraduationCap,
  GitBranch,
  Link2,
  Globe,
  Award,
  FolderGit2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  Briefcase,
  Save,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { getProficiencyLabel } from '../../types/skill';
import { ResumeApiService, type SavedResumeDraft } from '../../services/resumeService';

type ResumeTemplate = 'modern-ats' | 'technical' | 'fresher';

interface WorkExperienceItem {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
}

export const ResumePage: React.FC = () => {
  const { user } = useAuth();
  const { skills, projects, targetRole, overallReadinessScore, skillGaps } = useStudent();
  const navigate = useNavigate();

  // Template selection
  const [template, setTemplate] = useState<ResumeTemplate>('modern-ats');

  // Role tailoring
  const [tailorRole, setTailorRole] = useState<string>(targetRole || 'Full-Stack Developer');

  // Sections toggle & display order
  const [sections, setSections] = useState({
    summary: true,
    skills: true,
    projects: true,
    experience: true,
    education: true,
    assessments: true,
  });

  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'summary',
    'skills',
    'projects',
    'experience',
    'education',
  ]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSectionOrder((prev) => {
      const newOrder = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newOrder.length) return prev;
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      return newOrder;
    });
  };

  const handleTemplateChange = (newTemplate: ResumeTemplate) => {
    setTemplate(newTemplate);
    if (newTemplate === 'fresher') {
      setSectionOrder(['summary', 'education', 'skills', 'projects', 'experience']);
    } else if (newTemplate === 'technical') {
      setSectionOrder(['summary', 'skills', 'projects', 'experience', 'education']);
    } else {
      setSectionOrder(['summary', 'experience', 'skills', 'projects', 'education']);
    }
  };

  // Custom edits & extra sections
  const [customHeadline, setCustomHeadline] = useState(user?.headline || targetRole || 'Software Engineer');
  const [customBio, setCustomBio] = useState(user?.bio || '');
  const [experienceItems, setExperienceItems] = useState<WorkExperienceItem[]>([]);

  // Drafts & Persistence
  const [savedDrafts, setSavedDrafts] = useState<SavedResumeDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // UI Panels
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showQualityCard, setShowQualityCard] = useState(true);

  // Load existing drafts on mount
  useEffect(() => {
    const loadDrafts = async () => {
      const drafts = await ResumeApiService.listResumes();
      setSavedDrafts(drafts);
      if (drafts.length > 0) {
        const defaultDraft = drafts.find((d) => d.isDefault) || drafts[0];
        loadDraftIntoState(defaultDraft);
      }
    };
    loadDrafts();
  }, []);

  useEffect(() => {
    if (user?.bio && !customBio) {
      setCustomBio(user.bio);
    }
    if ((user?.headline || targetRole) && !customHeadline) {
      setCustomHeadline(user?.headline || targetRole || 'Software Engineer');
    }
  }, [user, targetRole]);

  const loadDraftIntoState = (draft: SavedResumeDraft) => {
    setActiveDraftId(draft.id);
    setTemplate(draft.templateId);
    if (draft.targetRole) setTailorRole(draft.targetRole);
    if (draft.sectionsConfig) {
      setSections({
        summary: draft.sectionsConfig.summary !== false,
        skills: draft.sectionsConfig.skills !== false,
        projects: draft.sectionsConfig.projects !== false,
        experience: draft.sectionsConfig.experience !== false,
        education: draft.sectionsConfig.education !== false,
        assessments: draft.sectionsConfig.assessments !== false,
      });
      if (Array.isArray(draft.sectionsConfig.order) && draft.sectionsConfig.order.length > 0) {
        setSectionOrder(draft.sectionsConfig.order);
      }
    }
    if (draft.customContent) {
      if (draft.customContent.headline) setCustomHeadline(draft.customContent.headline);
      if (draft.customContent.summary !== undefined) setCustomBio(draft.customContent.summary);
      if (Array.isArray(draft.customContent.experienceItems)) {
        setExperienceItems(draft.customContent.experienceItems);
      }
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const payload: Partial<SavedResumeDraft> = {
        title: `${tailorRole} Resume (${template.toUpperCase()})`,
        targetRole: tailorRole,
        templateId: template,
        sectionsConfig: {
          ...sections,
          order: sectionOrder,
        },
        customContent: {
          headline: customHeadline,
          summary: customBio,
          experienceItems,
        },
        isDefault: true,
      };

      let result: SavedResumeDraft | null = null;
      if (activeDraftId) {
        result = await ResumeApiService.updateResume(activeDraftId, payload);
      } else {
        result = await ResumeApiService.createResume(payload);
      }

      if (result) {
        setActiveDraftId(result.id);
        setSaveSuccessMsg('Resume draft saved securely to your account.');
        const drafts = await ResumeApiService.listResumes();
        setSavedDrafts(drafts);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddExperience = () => {
    setExperienceItems((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        role: 'Software Engineering Intern',
        company: 'Company / Project Team',
        duration: 'May 2025 – Aug 2025',
        description: 'Collaborated on developing backend services, unit tests, and performance improvements.',
      },
    ]);
  };

  const handleRemoveExperience = (id: string) => {
    setExperienceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateExperience = (id: string, field: keyof WorkExperienceItem, val: string) => {
    setExperienceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Filter skills and sort by verification status
  const verifiedSkills = useMemo(() => {
    return skills.filter(
      (s) => s.status === 'verified' || s.status === 'assessment-completed' || s.status === 'evidence-submitted'
    );
  }, [skills]);

  const displaySkills = verifiedSkills.length > 0 ? verifiedSkills : skills;

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    return displaySkills.reduce<Record<string, typeof displaySkills>>((acc, s) => {
      const cat = s.category || 'Core Technologies';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [displaySkills]);

  // Resume Quality & ATS Checks
  const qualityChecks = useMemo(() => {
    const items = [
      {
        id: 'contact',
        label: 'Contact Details & Location',
        passed: Boolean(user?.email && user?.location),
        tip: 'Email and location are required by ATS to route applications to local recruiters.',
      },
      {
        id: 'portfolio',
        label: 'Verifiable Links (GitHub / Portfolio)',
        passed: Boolean(user?.githubUrl || user?.portfolioUrl),
        tip: 'Technical screeners prioritize candidates with visible repositories or live demos.',
      },
      {
        id: 'summary',
        label: 'Professional Summary',
        passed: Boolean(customBio && customBio.trim().length > 30),
        tip: 'A 2-3 sentence overview highlighting your target specialty increases readability.',
      },
      {
        id: 'skills',
        label: 'Evidence-Backed Skills',
        passed: verifiedSkills.length >= 3,
        tip: `${verifiedSkills.length} of ${skills.length} skills are backed by assessments or evidence.`,
      },
      {
        id: 'projects',
        label: 'Repository Proof of Work',
        passed: projects.length >= 1,
        tip: `${projects.length} project(s) included. 2-3 detailed projects with code links is optimal.`,
      },
    ];

    const missingSkillsForRole = (skillGaps || [])
      .filter((g) => g.priority === 'High' && g.currentProficiency < g.requiredProficiency)
      .slice(0, 3)
      .map((g) => g.skillName);

    const passedCount = items.filter((i) => i.passed).length;
    const score = Math.round((passedCount / items.length) * 100);

    return { items, score, missingSkillsForRole };
  }, [user, customBio, verifiedSkills, skills, projects, skillGaps]);

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return sections.summary && customBio ? (
          <div key="summary" className="space-y-1.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] border-b border-slate-200 pb-1">
              Professional Summary
            </h2>
            <p className="text-xs leading-relaxed text-[#405B8B]">{customBio}</p>
          </div>
        ) : null;

      case 'education':
        return sections.education && (user?.degree || user?.institution) ? (
          <div key="education" className="space-y-1.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>Education & Academic Credentials</span>
              <span className="text-[10px] text-[#405B8B] font-bold">Graduation {user?.graduationYear || '2026'}</span>
            </h2>
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-extrabold text-[#0B1B43]">{user?.degree || 'Bachelor of Technology'}</span>
              <span className="text-[#405B8B]">{user?.institution || 'National Institute of Technology'}</span>
            </div>
          </div>
        ) : null;

      case 'experience':
        return sections.experience && experienceItems.length > 0 ? (
          <div key="experience" className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#087BFA]" />
              <span>Work & Internship Experience</span>
            </h2>

            <div className="space-y-3">
              {experienceItems.map((item) => (
                <div key={item.id} className="space-y-1 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                    <span className="font-extrabold text-[#0B1B43]">{item.role}</span>
                    <span className="text-[#405B8B] font-medium text-[11px]">{item.company} • {item.duration}</span>
                  </div>
                  <p className="text-[#405B8B] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'skills':
        return sections.skills ? (
          <div key="skills" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#087BFA]" />
                Technical Competencies & Skills
              </h2>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                Evidence-Backed Credential
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                <div key={category} className="space-y-1 text-xs">
                  <span className="font-bold text-[#0B1B43]">{category}: </span>
                  <span className="text-[#405B8B]">
                    {catSkills.map((s, idx) => (
                      <span key={s.id}>
                        <span className="font-semibold text-[#0B1B43]">{s.name}</span>
                        <span className="text-[11px] text-[#087BFA] font-medium">
                          {' '}(Lvl {s.proficiencyLevel} • {getProficiencyLabel(s.proficiencyLevel)})
                        </span>
                        {idx < catSkills.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case 'projects':
        return sections.projects ? (
          <div key="projects" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-[#603DF5]" />
                Projects & Verifiable Proof of Work
              </h2>
              <span className="text-[10px] text-[#405B8B]">
                {projects.length} repository {projects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No projects recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#0B1B43]">{proj.title}</h3>
                        <Badge
                          variant={
                            proj.verificationStatus === 'verified'
                              ? 'success'
                              : proj.verificationStatus === 'evidence-submitted'
                              ? 'purple'
                              : 'gray'
                          }
                          size="sm"
                        >
                          {proj.verificationStatus === 'verified'
                            ? 'Verified'
                            : proj.verificationStatus === 'evidence-submitted'
                            ? 'Submitted'
                            : 'Demonstrated'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        {proj.repositoryUrl && (
                          <a
                            href={proj.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#087BFA] font-bold hover:underline flex items-center gap-1"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Code Repo</span>
                          </a>
                        )}
                        {proj.liveDemoUrl && (
                          <a
                            href={proj.liveDemoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Live Demo</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#405B8B] leading-relaxed">{proj.description}</p>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {proj.technologies.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* ACTION TOOLBAR (Hidden in Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E7F2] shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/dashboard')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Dashboard
            </Button>
            <div>
              <h1 className="text-base font-extrabold text-[#0B1B43]">
                Skill Resume Studio
              </h1>
              <p className="text-xs text-[#405B8B]">
                Compile professional resumes tailored to target roles using verifiable credentials.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Version / Drafts Dropdown */}
            {savedDrafts.length > 0 && (
              <select
                value={activeDraftId || ''}
                onChange={(e) => {
                  const d = savedDrafts.find((item) => item.id === e.target.value);
                  if (d) loadDraftIntoState(d);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-[#E0E7F2] text-xs font-semibold text-[#0B1B43] bg-[#F4F7FC] outline-none cursor-pointer"
              >
                <option value="">Draft Versions ({savedDrafts.length})</option>
                {savedDrafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizeModal(true)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              Customize
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              leftIcon={<Save className="w-4 h-4 text-[#087BFA]" />}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* CONTROLS ROW: TEMPLATES & TARGET ROLES */}
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Template:</span>
            <div className="flex items-center gap-1.5 bg-[#F4F7FC] p-1 rounded-xl">
              <button
                onClick={() => handleTemplateChange('modern-ats')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  template === 'modern-ats'
                    ? 'bg-white text-[#087BFA] shadow-xs'
                    : 'text-[#405B8B] hover:text-[#0B1B43]'
                }`}
              >
                Modern ATS
              </button>
              <button
                onClick={() => handleTemplateChange('technical')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  template === 'technical'
                    ? 'bg-white text-[#603DF5] shadow-xs'
                    : 'text-[#405B8B] hover:text-[#0B1B43]'
                }`}
              >
                Technical / Engineering
              </button>
              <button
                onClick={() => handleTemplateChange('fresher')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  template === 'fresher'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-[#405B8B] hover:text-[#0B1B43]'
                }`}
              >
                Academic / Entry-Level
              </button>
            </div>
          </div>

          {/* Target Role Tailoring & ATS Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#405B8B]">Target Career:</span>
              <select
                value={tailorRole}
                onChange={(e) => setTailorRole(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-[#E0E7F2] text-xs font-bold text-[#0B1B43] bg-white outline-none cursor-pointer"
              >
                <option value="Full-Stack Developer">Full-Stack Developer</option>
                <option value="Frontend Engineer">Frontend Engineer</option>
                <option value="Backend Engineer">Backend Engineer</option>
                <option value="AI / ML Engineer">AI / ML Engineer</option>
                <option value="Cloud & DevOps Engineer">Cloud & DevOps Engineer</option>
                <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
              </select>
            </div>

            <button
              onClick={() => setShowQualityCard(!showQualityCard)}
              className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showQualityCard ? 'Hide ATS Checker' : 'Show ATS Checker'}</span>
            </button>
          </div>
        </Card>

        {/* SAVE SUCCESS BANNER */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* RESUME QUALITY & ATS READINESS CHECKER */}
        {showQualityCard && (
          <Card className="p-4 sm:p-5 space-y-3 bg-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E0E7F2] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#087BFA]" />
                <h3 className="font-extrabold text-sm text-[#0B1B43]">
                  ATS Readability & Quality Check
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-[#405B8B]">Health Score:</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    qualityChecks.score >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : qualityChecks.score >= 60
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {qualityChecks.score}% Complete
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {qualityChecks.items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-white border border-[#E0E7F2] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B1B43]">{item.label}</span>
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#405B8B] leading-tight">{item.tip}</p>
                </div>
              ))}
            </div>

            {/* Target Role Missing Skills Suggestion */}
            {qualityChecks.missingSkillsForRole.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-[#603DF5] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Tailoring Suggestion for {tailorRole}:
                  </span>
                  <span className="text-[11px] text-[#405B8B]">
                    Recruiters searching for {tailorRole} frequently require{' '}
                    <strong>{qualityChecks.missingSkillsForRole.join(', ')}</strong>. If you have practical experience in these areas, consider practicing or submitting evidence.
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* PRINT-OPTIMIZED RESUME SHEET */}
      <div
        className={`resume-sheet bg-white p-8 sm:p-12 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-7 text-[#0B1B43] ${
          template === 'technical'
            ? 'border-t-8 border-t-[#603DF5]'
            : template === 'fresher'
            ? 'border-t-8 border-t-emerald-600'
            : 'border-t-8 border-t-[#0B1B43]'
        }`}
      >
        {/* HEADER SECTION */}
        <div className="border-b-2 border-[#0B1B43] pb-5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl font-black text-[#0B1B43] tracking-tight">
                {user?.fullName || 'Candidate Name'}
              </h1>
              <p className="text-base font-bold text-[#087BFA] mt-0.5">
                {customHeadline || tailorRole}
              </p>
            </div>

            {sections.assessments && overallReadinessScore !== null && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start text-xs font-bold text-[#0B1B43]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Readiness: {overallReadinessScore}%</span>
              </div>
            )}
          </div>

          {/* Contact Details & Links Grid */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#405B8B] pt-0.5">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${user.email}`} className="hover:underline text-[#0B1B43]">
                  {user.email}
                </a>
              </span>
            )}

            {user?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.location}</span>
              </span>
            )}

            {(user?.degree || user?.institution) && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {[user?.degree, user?.institution, user?.graduationYear].filter(Boolean).join(' • ')}
                </span>
              </span>
            )}

            {user?.githubUrl && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#087BFA] font-medium"
                >
                  GitHub
                </a>
              </span>
            )}

            {user?.linkedinUrl && (
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#087BFA] font-medium"
                >
                  LinkedIn
                </a>
              </span>
            )}

            {user?.portfolioUrl && (
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-emerald-600 font-medium"
                >
                  Portfolio
                </a>
              </span>
            )}
          </div>
        </div>

        {/* DYNAMIC SECTIONS RENDERED ACCORDING TO USER ORDER */}
        {sectionOrder.map((sectionKey) => renderSection(sectionKey))}

        {/* FOOTER AUDIT NOTE */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-[#405B8B]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#087BFA]" />
            <span>Generated by SARATHI Career Intelligence Platform • Tamper-Verifiable Evidence</span>
          </div>
          <span>Updated as of {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* CUSTOMIZE MODAL */}
      {showCustomizeModal && (
        <Modal
          isOpen={showCustomizeModal}
          onClose={() => setShowCustomizeModal(false)}
          title="Customize Resume Content"
          subtitle="Tailor your resume sections and add practical experience without changing your core profile"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setShowCustomizeModal(false)}>
                Done
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowCustomizeModal(false);
                  handleSaveDraft();
                }}
              >
                Save & Apply
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-xs text-[#0B1B43]">
            {/* Section Visibility & Ordering */}
            <div className="space-y-2">
              <span className="font-extrabold text-sm text-[#0B1B43] block">Sections & Display Order</span>
              <p className="text-[11px] text-[#405B8B]">
                Toggle sections or use the arrows to reorder how sections appear on your exported resume.
              </p>
              <div className="space-y-1.5">
                {sectionOrder.map((key, idx) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-xl border border-[#E0E7F2] bg-[#F4F7FC]/70"
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(sections[key as keyof typeof sections])}
                        onChange={(e) =>
                          setSections((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="rounded text-[#087BFA]"
                      />
                      <span className="font-bold capitalize">{key}</span>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        className="p-1 rounded bg-white border border-[#E0E7F2] text-[#405B8B] hover:text-[#0B1B43] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        className="p-1 rounded bg-white border border-[#E0E7F2] text-[#405B8B] hover:text-[#0B1B43] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Headline & Summary */}
            <div className="space-y-3 pt-2 border-t border-[#E0E7F2]">
              <span className="font-extrabold text-sm text-[#0B1B43] block">
                Target Role Headline & Summary
              </span>
              <div>
                <label className="text-[11px] font-bold text-[#405B8B] block mb-1">Headline</label>
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0E7F2] text-xs text-[#0B1B43] outline-none focus:border-[#087BFA]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#405B8B] block mb-1">Professional Summary</label>
                <textarea
                  rows={3}
                  value={customBio}
                  onChange={(e) => setCustomBio(e.target.value)}
                  placeholder="Describe your technical focus, passion, and engineering background..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E0E7F2] text-xs text-[#0B1B43] outline-none focus:border-[#087BFA]"
                />
              </div>
            </div>

            {/* Work & Internship Experience Items */}
            <div className="space-y-3 pt-2 border-t border-[#E0E7F2]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-[#0B1B43] block">
                    Internships & Experience
                  </span>
                  <span className="text-[11px] text-[#405B8B]">
                    Add practical internship or relevant student project experience.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddExperience}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Experience
                </Button>
              </div>

              {experienceItems.length === 0 ? (
                <div className="p-3 bg-[#F4F7FC] rounded-xl text-center text-[11px] text-[#405B8B]">
                  No custom internship items added. Click "Add Experience" to include one.
                </div>
              ) : (
                <div className="space-y-3">
                  {experienceItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-[#E0E7F2] bg-[#F8FAFC] space-y-2 relative"
                    >
                      <button
                        onClick={() => handleRemoveExperience(item.id)}
                        className="absolute right-3 top-3 text-rose-500 hover:text-rose-700"
                        title="Remove experience item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pr-6">
                        <input
                          type="text"
                          placeholder="Role (e.g. Frontend Intern)"
                          value={item.role}
                          onChange={(e) => handleUpdateExperience(item.id, 'role', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Company (e.g. Acme Labs)"
                          value={item.company}
                          onChange={(e) => handleUpdateExperience(item.id, 'company', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. Jun 2025 - Aug 2025)"
                          value={item.duration}
                          onChange={(e) => handleUpdateExperience(item.id, 'duration', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs outline-none"
                        />
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Bullet points or summary of responsibilities and achievements..."
                        value={item.description}
                        onChange={(e) => handleUpdateExperience(item.id, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* PRINT-SPECIFIC CSS RULES */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
          .resume-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          aside, header, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
