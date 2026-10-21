import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Printer,
  ShieldCheck,
  FolderGit2,
  GraduationCap,
  Share2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  X,
  Globe,
  Search,
  BookOpen,
  Brain,
  History,
  AlertTriangle,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Logo } from '../../components/common/Logo';
import { Modal } from '../../components/common/Modal';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import type { SkillItem } from '../../types/skill';

interface ShareConfig {
  includeSkills: boolean;
  includeProjects: boolean;
  includeContact: boolean;
  includeAssessments: boolean;
}

interface BackendEvidence {
  id: string;
  skill_id: string;
  skill_name: string;
  evidence_type: string;
  title: string;
  reference_url: string;
  metadata?: any;
  source: string;
  verification_status: string;
  created_at: string;
}

export const SkillPassportPage: React.FC = () => {
  const { user } = useAuth();
  const {
    targetRole,
    skills,
    projects,
    roadmap,
    overallReadinessScore,
    assessedSkillsCount,
    markPassportReviewed
  } = useStudent();

  const [shareData, setShareData] = useState<{
    publicId: string;
    isPublic?: boolean;
    isEnabled?: boolean;
    sectionsConfig?: ShareConfig;
  } | null>(null);

  const [sectionsConfig, setSectionsConfig] = useState<ShareConfig>({
    includeSkills: true,
    includeProjects: true,
    includeContact: false,
    includeAssessments: true,
  });

  const [showShareModal, setShowShareModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Backend authoritative passport data
  const [backendEvidence, setBackendEvidence] = useState<BackendEvidence[]>([]);
  const [backendAssessments, setBackendAssessments] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | 'Verified' | 'Evaluated' | 'In Development'>('All');
  const [selectedSkillForTimeline, setSelectedSkillForTimeline] = useState<SkillItem | null>(null);

  // Add evidence form state inside timeline modal
  const [showAddEvidenceForm, setShowAddEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'project_repo' | 'certification' | 'course' | 'work_experience'>('project_repo');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSubmitMessage, setEvidenceSubmitMessage] = useState<string | null>(null);
  const [evidenceSubmitError, setEvidenceSubmitError] = useState<string | null>(null);

  const fetchAuthoritativeData = async () => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          evidence?: BackendEvidence[];
          assessments?: any[];
        };
      }>('/api/candidates/my-passport');
      if (res?.data) {
        if (Array.isArray(res.data.evidence)) {
          setBackendEvidence(res.data.evidence);
        }
        if (Array.isArray(res.data.assessments)) {
          setBackendAssessments(res.data.assessments);
        }
      }
    } catch {
      // Fallback gracefully
    }
  };

  // Fetch share configuration & backend evidence
  useEffect(() => {
    markPassportReviewed();
  }, [markPassportReviewed]);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await apiClient.get<{
          success: boolean;
          data: {
            publicId: string;
            isPublic: boolean;
            sectionsConfig?: ShareConfig;
          };
        }>('/api/passport/share');
        if (res?.success && res.data) {
          setShareData({
            publicId: res.data.publicId,
            isEnabled: res.data.isPublic,
            sectionsConfig: res.data.sectionsConfig,
          });
          if (res.data.sectionsConfig) {
            setSectionsConfig(res.data.sectionsConfig);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch passport share info', err);
      }
    };

    fetchShare();
    fetchAuthoritativeData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleShare = async () => {
    setIsToggling(true);
    try {
      const nextState = !shareData?.isEnabled;
      const res = await apiClient.post<{
        success: boolean;
        data: { publicId: string; isPublic: boolean };
      }>('/api/passport/share/toggle', { isPublic: nextState });
      if (res?.success) {
        setShareData((prev) =>
          prev ? { ...prev, isEnabled: res.data.isPublic } : { publicId: res.data.publicId, isEnabled: res.data.isPublic }
        );
      }
    } catch (err) {
      console.error('Failed to toggle share state', err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveShareConfig = async () => {
    setIsSavingConfig(true);
    setConfigSuccess(false);
    try {
      const res = await apiClient.put<{
        success: boolean;
        data: { sectionsConfig: ShareConfig };
      }>('/api/passport/share/config', { sectionsConfig });
      if (res?.success) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save share config', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!window.confirm('Revoking your current link will immediately disable the old link. Any recruiters or platforms using the previous link will see an unavailable notice. Do you want to proceed?')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { publicId: string; shareUrl: string };
      }>('/api/passport/share/regenerate', {});
      if (res?.success) {
        setShareData((prev) =>
          prev ? { ...prev, publicId: res.data.publicId } : { publicId: res.data.publicId, isEnabled: true }
        );
      }
    } catch (err) {
      console.error('Failed to regenerate share link', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const publicUrl = shareData?.publicId ? `${window.location.origin}/passport/${shareData.publicId}` : '';

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isVerified = skills.some((s) => s.status === 'verified') || projects.some((p) => p.verificationStatus === 'verified');

  const getStatusBadge = (status: string, level: number) => {
    switch (status) {
      case 'verified':
        return { variant: 'success' as const, label: `Level ${level} • Verified Credential` };
      case 'assessment-completed':
        return { variant: 'blue' as const, label: `Level ${level} • Diagnostic Evaluated` };
      case 'evidence-submitted':
        return { variant: 'purple' as const, label: `Level ${level} • Pending Review` };
      default:
        return { variant: 'gray' as const, label: `Level ${level} • Self-Reported` };
    }
  };

  const handleAddEvidence = async (skillName: string) => {
    if (!evidenceTitle.trim() || !evidenceUrl.trim() || !evidenceDescription.trim()) {
      setEvidenceSubmitError('Please fill in all required fields (title, reference URL, description).');
      return;
    }

    setIsSubmittingEvidence(true);
    setEvidenceSubmitError(null);
    setEvidenceSubmitMessage(null);

    try {
      await apiClient.post('/api/candidates/evidence', {
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim(),
        repositoryUrl: evidenceUrl.trim(),
        skillsDemonstrated: [skillName],
        technologies: [skillName],
        evidenceType,
      });

      setEvidenceSubmitMessage('Evidence recorded successfully to your Skill Passport.');
      setEvidenceTitle('');
      setEvidenceUrl('');
      setEvidenceDescription('');
      setShowAddEvidenceForm(false);
      await fetchAuthoritativeData();
      setTimeout(() => setEvidenceSubmitMessage(null), 3000);
    } catch (err: any) {
      setEvidenceSubmitError(err.response?.data?.error || err.message || 'Failed to submit evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Distinct categories available in current skills
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    skills.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [skills]);

  // Filtered skills list
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;

      const matchesStatus =
        selectedStatusFilter === 'All' ||
        (selectedStatusFilter === 'Verified' && s.status === 'verified') ||
        (selectedStatusFilter === 'Evaluated' && s.status === 'assessment-completed') ||
        (selectedStatusFilter === 'In Development' && (s.status === 'evidence-submitted' || s.status === 'self-reported'));

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [skills, searchQuery, selectedCategory, selectedStatusFilter]);

  // Find related evidence for a specific skill (used in timeline modal)
  const getEvidenceForSkill = (skill: SkillItem) => {
    const skillNameLower = skill.name.toLowerCase();

    // Matching backend evidence records
    const matchingBackend = backendEvidence.filter(
      (e) => (e.skill_name || '').toLowerCase() === skillNameLower || e.skill_id === skill.id
    );

    // Matching frontend projects
    const matchingProjects = projects.filter(
      (p) =>
        p.skillsDemonstrated.some((s) => s.toLowerCase() === skillNameLower) ||
        p.technologies.some((t) => t.toLowerCase() === skillNameLower)
    );

    // Matching assessment results
    const matchingAssessments = backendAssessments.filter((a) => {
      const skillsAwarded = Array.isArray(a.verified_skill_awards) ? a.verified_skill_awards : [];
      return skillsAwarded.some((s: string) => s.toLowerCase() === skillNameLower);
    });

    return {
      matchingBackend,
      matchingProjects,
      matchingAssessments,
      hasAnyEvidence:
        matchingBackend.length > 0 || matchingProjects.length > 0 || matchingAssessments.length > 0,
    };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ACTION BAR (Hidden during printing) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-xs">
        <div>
          <Badge variant="purple" icon={<Award className="w-3.5 h-3.5" />}>
            VERIFIABLE CREDENTIAL PASSPORT
          </Badge>
          <h2 className="text-2xl font-extrabold text-[#0B1B43] mt-1">Skill Passport</h2>
          <p className="text-xs text-[#405B8B]">
            Official evidence-backed profile for recruiters, enterprise hiring managers, and academic evaluators.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowShareModal(true)}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Link
          </Button>

          <Button
            variant="purple"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Export / Print Passport
          </Button>
        </div>
      </div>

      {/* PRINT-FRIENDLY PASSPORT CARD CONTAINER */}
      <div className="print-card bg-white rounded-2xl border border-[#E0E7F2] p-8 sm:p-10 shadow-lg space-y-8 max-w-4xl mx-auto">
        {/* PASSPORT HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#E0E7F2] pb-6 gap-4">
          <div className="space-y-2">
            <Logo size="md" showTagline={true} />
            <h1 className="text-3xl font-black text-[#0B1B43] pt-2">{user?.fullName || 'Student'}</h1>
            <p className="text-sm font-bold text-[#087BFA]">
              Target Role: {targetRole || 'Not selected yet'}
            </p>
            <div className="flex items-center gap-4 text-xs text-[#405B8B] pt-1">
              <span className="flex items-center gap-1 font-medium">
                <GraduationCap className="w-4 h-4 text-[#603DF5]" />{' '}
                {user?.institution || 'Institution not specified'}
              </span>
              <span>•</span>
              <span>
                {user?.degree || 'Degree not specified'}{' '}
                {user?.graduationYear ? `(${user.graduationYear})` : ''}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-2 shrink-0">
            <div className="inline-flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase">Readiness Index</span>
              <div className="text-3xl sm:text-4xl font-black text-[#087BFA]">
                {overallReadinessScore !== null ? `${overallReadinessScore}%` : 'Not assessed'}
              </div>
              <span className="text-[11px] font-medium text-[#405B8B] mt-0.5">
                {assessedSkillsCount} evaluated {assessedSkillsCount === 1 ? 'skill' : 'skills'}
              </span>
            </div>
            <div className="block">
              {isVerified ? (
                <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                  Verified Credential Status
                </Badge>
              ) : (
                <Badge variant="purple" icon={<Clock className="w-3.5 h-3.5" />}>
                  Awaiting Assessment & Verification
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-[#405B8B] block">
              Passport ID: {user?.id ? `SAR-${user.id.slice(-6).toUpperCase()}` : 'SAR-PENDING'}
            </span>
          </div>
        </div>

        {/* SECTION 1: SKILL INVENTORY & TRANSPARENT EVIDENCE MATRIX */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-l-[#087BFA] pl-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#0B1B43]">
                Assessed Skill Matrix ({skills.length})
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Click on any skill to inspect supporting repository proof, completed learning, and assessment audits.
              </p>
            </div>

            {/* Link to Skill Gap Analysis */}
            <Link
              to="/student/skill-gap"
              className="text-xs font-bold text-[#087BFA] hover:underline no-print flex items-center gap-1 shrink-0"
            >
              <span>Analyze Gaps</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Interactive Search & Category Filter (Hidden in Print) */}
          <div className="no-print space-y-2.5 bg-[#F4F7FC]/70 p-3 rounded-xl border border-[#E0E7F2]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#405B8B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs text-[#0B1B43] outline-none focus:border-[#087BFA]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {availableCategories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#087BFA] text-white shadow-xs'
                        : 'bg-white text-[#405B8B] hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Status & Verification Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 border-t border-[#E0E7F2]/60 scrollbar-none">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Status:
              </span>
              {(['All', 'Verified', 'Evaluated', 'In Development'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    selectedStatusFilter === st
                      ? 'bg-[#0B1B43] text-white shadow-2xs'
                      : 'bg-white/80 text-[#405B8B] hover:bg-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F4F7FC]/70 border border-[#E0E7F2] text-xs text-[#405B8B] text-center">
              No skills match your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSkills.map((skill) => {
                const badgeInfo = getStatusBadge(skill.status, skill.proficiencyLevel);
                const isSelfReported = skill.status === 'self-reported';

                return (
                  <div
                    key={skill.id}
                    onClick={() => setSelectedSkillForTimeline(skill)}
                    className="p-3.5 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2] flex items-center justify-between text-xs hover:border-[#087BFA] transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0B1B43] group-hover:text-[#087BFA] transition-colors">
                          {skill.name}
                        </span>
                        <History className="w-3 h-3 text-[#405B8B] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[11px] text-[#405B8B] block">
                        Category: {skill.category}
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <Badge variant={badgeInfo.variant} size="sm">
                        {badgeInfo.label}
                      </Badge>
                      {isSelfReported && (
                        <span className="text-[10px] text-amber-700 font-medium block">
                          No audited proof
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: VERIFIED PROJECTS & PROOF OF WORK */}
        <div className="space-y-4 pt-4 border-t border-[#E0E7F2]">
          <div className="flex justify-between items-center border-l-4 border-l-[#603DF5] pl-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#0B1B43]">
                Practical Proof of Work & Projects ({projects.length})
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Repositories and live demonstrations submitted for candidate verification.
              </p>
            </div>

            <Link
              to="/student/projects"
              className="text-xs font-bold text-[#603DF5] hover:underline no-print flex items-center gap-1"
            >
              <span>Manage Projects</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F4F7FC]/70 border border-[#E0E7F2] text-xs text-[#405B8B] text-center">
              No project evidence submitted yet. Add code repositories and live demos in Projects & Portfolio to substantiate your practical skills.
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 rounded-2xl border border-[#E0E7F2] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-[#0B1B43]">{proj.title}</h4>
                    <Badge variant={proj.verificationStatus === 'verified' ? 'success' : 'purple'} size="sm">
                      {proj.verificationStatus === 'verified' ? 'Verified Credential' : 'Pending Review'}
                    </Badge>
                  </div>

                  <p className="text-[#405B8B]">{proj.description}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <div className="flex gap-1 flex-wrap">
                      {proj.skillsDemonstrated.map((s) => (
                        <span
                          key={s}
                          className="bg-purple-50 text-[#603DF5] px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <a
                      href={proj.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#087BFA] hover:underline flex items-center gap-1 truncate max-w-full sm:max-w-xs shrink-0"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{proj.repositoryUrl.replace('https://', '')}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: LEARNING MILESTONES & ISSUANCE AUDIT */}
        <div className="pt-4 border-t border-[#E0E7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#405B8B]">
          <div>
            <span className="font-bold text-[#0B1B43]">Learning Roadmap Milestones: </span>
            <span>
              {!roadmap
                ? 'Roadmap not created yet'
                : `${roadmap.overallProgress}% Completed across ${roadmap.stages.length} stages`}
            </span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-[#405B8B] block">Issuing Authority</span>
            <span className="font-bold text-[#0B1B43]">SARATHI AI Platform • Verifiable Credential Registry</span>
          </div>
        </div>
      </div>

      {/* SKILL EVIDENCE & TIMELINE AUDIT MODAL */}
      {selectedSkillForTimeline && (
        <Modal
          isOpen={Boolean(selectedSkillForTimeline)}
          onClose={() => setSelectedSkillForTimeline(null)}
          title={`Skill History & Evidence: ${selectedSkillForTimeline.name}`}
          subtitle={`Category: ${selectedSkillForTimeline.category} • Current Level: ${selectedSkillForTimeline.proficiencyLevel}/5`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Link to={`/student/resources?search=${encodeURIComponent(selectedSkillForTimeline.name)}`}>
                <Button variant="outline" size="sm" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
                  Find Tutorials
                </Button>
              </Link>

              <Link to="/student/assessment">
                <Button variant="primary" size="sm" leftIcon={<Brain className="w-3.5 h-3.5" />}>
                  Take Diagnostic Test
                </Button>
              </Link>
            </div>
          }
        >
          {(() => {
            const ev = getEvidenceForSkill(selectedSkillForTimeline);
            return (
              <div className="space-y-4 text-xs text-[#0B1B43]">
                {/* Status Callout */}
                <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#405B8B] block">Current Credential Status</span>
                    <span className="font-extrabold text-sm text-[#0B1B43] capitalize">
                      {selectedSkillForTimeline.status.replace('-', ' ')}
                    </span>
                  </div>
                  <Badge variant={getStatusBadge(selectedSkillForTimeline.status, selectedSkillForTimeline.proficiencyLevel).variant}>
                    {getStatusBadge(selectedSkillForTimeline.status, selectedSkillForTimeline.proficiencyLevel).label}
                  </Badge>
                </div>

                {/* Evidence Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#0B1B43]">Demonstrated Proof & Submissions</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEvidenceForm(!showAddEvidenceForm);
                        setEvidenceSubmitError(null);
                      }}
                      className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddEvidenceForm ? 'Cancel' : 'Add Proof / Evidence'}</span>
                    </button>
                  </div>

                  {showAddEvidenceForm && (
                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0B1B43]">
                          Submit New Evidence for {selectedSkillForTimeline.name}
                        </span>
                        <span className="text-[10px] text-[#405B8B] font-medium">
                          Recorded with transparent verification status
                        </span>
                      </div>

                      {evidenceSubmitError && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                          {evidenceSubmitError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#405B8B] block mb-1">Evidence Type</label>
                            <select
                              value={evidenceType}
                              onChange={(e) => setEvidenceType(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs text-[#0B1B43] outline-none"
                            >
                              <option value="project_repo">Project / Repository (Pending Review)</option>
                              <option value="certification">Certificate / Credential (Self-Reported)</option>
                              <option value="course">Course / Workshop (Self-Reported)</option>
                              <option value="work_experience">Internship / Practical Experience (Self-Reported)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#405B8B] block mb-1">Title / Credential Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Distributed Task Queue or AWS Certified..."
                              value={evidenceTitle}
                              onChange={(e) => setEvidenceTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs text-[#0B1B43] outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#405B8B] block mb-1">Proof URL / Reference Link</label>
                          <input
                            type="text"
                            placeholder="https://github.com/your-username/repo or credential URL"
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs text-[#0B1B43] outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#405B8B] block mb-1">Description / Key Learnings</label>
                          <textarea
                            rows={2}
                            placeholder="Describe what you built or practical concepts demonstrated..."
                            value={evidenceDescription}
                            onChange={(e) => setEvidenceDescription(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-xs text-[#0B1B43] outline-none"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSubmittingEvidence}
                            onClick={() => handleAddEvidence(selectedSkillForTimeline.name)}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                          >
                            {isSubmittingEvidence ? 'Submitting...' : 'Record Evidence'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {evidenceSubmitMessage && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{evidenceSubmitMessage}</span>
                    </div>
                  )}

                  {!ev.hasAnyEvidence ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Evidence Gap Identified</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        This skill is currently self-reported without submitted repository proof, completed tutorials, or diagnostic assessment results.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Projects demonstrating skill */}
                      {ev.matchingProjects.map((proj) => (
                        <div key={proj.id} className="p-3 rounded-xl border border-[#E0E7F2] bg-white space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#0B1B43]">Project: {proj.title}</span>
                            <Badge variant={proj.verificationStatus === 'verified' ? 'success' : 'purple'} size="sm">
                              {proj.verificationStatus}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#405B8B]">{proj.description}</p>
                          <a
                            href={proj.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#087BFA] font-bold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect Repository</span>
                          </a>
                        </div>
                      ))}

                      {/* Backend learning evidence */}
                      {ev.matchingBackend.map((item) => (
                        <div key={item.id} className="p-3 rounded-xl border border-[#E0E7F2] bg-white space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#0B1B43]">Evidence: {item.title}</span>
                            <Badge variant="purple" size="sm">
                              {item.verification_status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-[#405B8B] block">
                            Source: {item.source} • Recorded {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* SHARE MODAL WITH PRIVACY CONTROLS */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1B43]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E0E7F2] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-[#603DF5] rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B43]">Share Skill Passport</h3>
                  <p className="text-xs text-[#405B8B]">Create a public, tamper-verifiable credential link</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-[#405B8B] hover:text-[#0B1B43] rounded-lg hover:bg-[#F4F7FC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0E7F2] rounded-xl p-4 space-y-4">
              {/* Toggle Public Access */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#0B1B43]">Public Link Access</p>
                  <p className="text-xs text-[#405B8B]">
                    {shareData?.isEnabled
                      ? 'Anyone with this link can view your verified credential profile.'
                      : 'Public access is disabled. The link will show an unavailable notice.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={isToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    shareData?.isEnabled ? 'bg-[#087BFA]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      shareData?.isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* URL & Copy button */}
              {shareData?.isEnabled && (
                <div className="pt-2 border-t border-[#E0E7F2] space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#405B8B] block mb-1">
                      Public Passport URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-mono text-[#0B1B43] focus:outline-none select-all"
                      />
                      <Button
                        variant={copied ? 'success' : 'outline'}
                        size="sm"
                        onClick={handleCopyLink}
                        leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  {/* Privacy Controls: Section Toggles */}
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-bold text-[#0B1B43] block">
                      Privacy Controls (Select what recruiters see)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#0B1B43]">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sectionsConfig.includeSkills}
                          onChange={(e) =>
                            setSectionsConfig((p) => ({ ...p, includeSkills: e.target.checked }))
                          }
                          className="rounded text-[#087BFA]"
                        />
                        <span>Assessed Skills</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sectionsConfig.includeProjects}
                          onChange={(e) =>
                            setSectionsConfig((p) => ({ ...p, includeProjects: e.target.checked }))
                          }
                          className="rounded text-[#087BFA]"
                        />
                        <span>Project Proof</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sectionsConfig.includeAssessments}
                          onChange={(e) =>
                            setSectionsConfig((p) => ({ ...p, includeAssessments: e.target.checked }))
                          }
                          className="rounded text-[#087BFA]"
                        />
                        <span>Assessments</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sectionsConfig.includeContact}
                          onChange={(e) =>
                            setSectionsConfig((p) => ({ ...p, includeContact: e.target.checked }))
                          }
                          className="rounded text-[#087BFA]"
                        />
                        <span>Contact Info (Email)</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveShareConfig}
                        disabled={isSavingConfig}
                        className="text-xs text-[#087BFA] hover:underline"
                      >
                        {isSavingConfig ? 'Saving...' : configSuccess ? 'Saved!' : 'Save Privacy Settings'}
                      </Button>

                      {/* Revoke / Regenerate Link Button */}
                      <button
                        onClick={handleRegenerateLink}
                        disabled={isRegenerating}
                        className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                        <span>Revoke Old Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {shareData?.isEnabled ? (
                <a
                  href={`/passport/${shareData.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview Public View
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-medium">Enable public access to share</span>
              )}

              <Button variant="primary" onClick={() => setShowShareModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
