import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle,
  PauseCircle
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { JobItem, DomainItem, SkillItem, JobSkillReq } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { Button, Card, Badge, Modal, EmptyState, PageHeader } from '../../components/common';

export const RecruiterJobsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Job Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formDomainId, setFormDomainId] = useState('');
  const [formExperienceLevel, setFormExperienceLevel] = useState('mid');
  const [formEmploymentType, setFormEmploymentType] = useState('full_time');
  const [formWorkArrangement, setFormWorkArrangement] = useState('hybrid');
  const [formLocation, setFormLocation] = useState('Bangalore, India');
  const [formSalaryMin, setFormSalaryMin] = useState<number | ''>(2000000);
  const [formSalaryMax, setFormSalaryMax] = useState<number | ''>(3200000);
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formSkills, setFormSkills] = useState<JobSkillReq[]>([]);

  // Skill Add Selector
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsData, domainsData, skillsData] = await Promise.all([
        recruiterApi.getJobs(statusFilter === 'all' ? undefined : statusFilter, search || undefined),
        recruiterApi.getDomains(),
        recruiterApi.getSkills(),
      ]);
      setJobs(jobsData);
      setDomains(domainsData);
      setAvailableSkills(skillsData);
      if (domainsData.length > 0 && !formDomainId) {
        setFormDomainId(domainsData[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId, refreshKey, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingJobId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDepartment('Engineering');
    setFormDomainId(domains[0]?.id || '');
    setFormExperienceLevel('mid');
    setFormEmploymentType('full_time');
    setFormWorkArrangement('hybrid');
    setFormLocation('Bangalore, India');
    setFormSalaryMin(2000000);
    setFormSalaryMax(3200000);
    setFormStatus('published');
    setFormSkills([
      { skillId: 'sk-react', requirementType: 'required', targetProficiency: 4, weight: 1.5, assessmentRequired: true },
      { skillId: 'sk-typescript', requirementType: 'required', targetProficiency: 4, weight: 1.2, assessmentRequired: false },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = async (jobId: string) => {
    try {
      const fullJob = await recruiterApi.getJobById(jobId);
      setEditingJobId(jobId);
      setFormTitle(fullJob.title);
      setFormDescription(fullJob.description);
      setFormDepartment(fullJob.department);
      setFormDomainId(fullJob.domain_id || domains[0]?.id || '');
      setFormExperienceLevel(fullJob.experience_level);
      setFormEmploymentType(fullJob.employment_type);
      setFormWorkArrangement(fullJob.work_arrangement);
      setFormLocation(fullJob.location);
      setFormSalaryMin(fullJob.salary_min || '');
      setFormSalaryMax(fullJob.salary_max || '');
      setFormStatus(fullJob.status === 'archived' ? 'draft' : (fullJob.status as any));
      setFormSkills(fullJob.skills?.map(s => ({
        skillId: s.skillId,
        requirementType: s.requirementType,
        targetProficiency: s.targetProficiency,
        weight: s.weight,
        assessmentRequired: s.assessmentRequired,
      })) || []);
      setIsModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load job details', 'error');
    }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }

    try {
      const payload: any = {
        title: formTitle,
        description: formDescription,
        department: formDepartment,
        domainId: formDomainId,
        experienceLevel: formExperienceLevel,
        employmentType: formEmploymentType,
        workArrangement: formWorkArrangement,
        location: formLocation,
        salaryMin: formSalaryMin === '' ? null : Number(formSalaryMin),
        salaryMax: formSalaryMax === '' ? null : Number(formSalaryMax),
        status: formStatus,
        skills: formSkills,
      };

      if (editingJobId) {
        await recruiterApi.updateJob(editingJobId, payload);
        showToast('Job posting updated successfully', 'success');
      } else {
        await recruiterApi.createJob(payload);
        showToast('New job posting created and published', 'success');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save job', 'error');
    }
  };

  const handleStatusTransition = async (jobId: string, newStatus: any) => {
    try {
      await recruiterApi.updateJob(jobId, { status: newStatus });
      showToast(`Job status changed to ${newStatus}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Status transition rejected', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to archive this job posting?')) return;
    try {
      await recruiterApi.deleteJob(jobId);
      showToast('Job posting archived successfully', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive job', 'error');
    }
  };

  const addSkillToRequirement = () => {
    if (!selectedSkillToAdd) return;
    if (formSkills.some(s => s.skillId === selectedSkillToAdd)) {
      showToast('Skill already in requirements', 'info');
      return;
    }
    setFormSkills(prev => [
      ...prev,
      { skillId: selectedSkillToAdd, requirementType: 'required', targetProficiency: 3, weight: 1.0, assessmentRequired: false }
    ]);
    setSelectedSkillToAdd('');
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Job Postings & Requirements"
        description="Define multi-domain competency profiles, proficiency thresholds, and assessment rubrics."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Enterprise Roles
          </Badge>
        }
        actions={
          <Button
            variant="indigo"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Create New Job
          </Button>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, department, or keywords..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'published', 'draft', 'paused', 'closed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* JOBS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Briefcase}
            title="No Job Postings Found"
            description={
              search || statusFilter !== 'all'
                ? "No openings matched your search or status filter. Try clearing your filters."
                : "Get started by posting your first verified role to benchmark applicants against required skill profiles."
            }
            action={
              <Button variant="indigo" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Create New Job
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        job.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : job.status === 'draft'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : job.status === 'paused'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{job.department}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">{job.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(job.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Edit Job"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      title="Archive Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{job.description}</p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.location} ({job.work_arrangement})
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    ₹{((job.salary_min || 0) / 100000).toFixed(1)}L - ₹{((job.salary_max || 0) / 100000).toFixed(1)}L PA
                  </span>
                </div>
              </div>

              {/* Bottom Lifecycle Actions & Applicant Count */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  <strong className="text-indigo-600 font-black">{job.applicant_count || 0}</strong> Applicants
                </span>

                <div className="flex items-center gap-2">
                  {job.status === 'draft' && (
                    <button
                      onClick={() => handleStatusTransition(job.id, 'published')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  )}
                  {job.status === 'published' && (
                    <button
                      onClick={() => handleStatusTransition(job.id, 'paused')}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[11px] flex items-center gap-1"
                    >
                      <PauseCircle className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button
                      onClick={() => handleStatusTransition(job.id, 'published')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  )}
                  {job.status !== 'closed' && job.status !== 'archived' && (
                    <button
                      onClick={() => handleStatusTransition(job.id, 'closed')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px]"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT JOB MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJobId ? 'Edit Job Posting & Skill Profile' : 'Post New Verified Opportunity'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveJob} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Job Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Lead Full-Stack Platform Engineer"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Technical Domain *</label>
                    <select
                      value={formDomainId}
                      onChange={(e) => setFormDomainId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    >
                      {domains.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                    <input
                      type="text"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Job Description & Responsibilities *</label>
                  <textarea
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe role responsibilities, core engineering challenges, and team expectations..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Experience Level</label>
                    <select
                      value={formExperienceLevel}
                      onChange={(e) => setFormExperienceLevel(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    >
                      <option value="entry">Entry (0-2 Yrs)</option>
                      <option value="mid">Mid (2-5 Yrs)</option>
                      <option value="senior">Senior (5-8 Yrs)</option>
                      <option value="lead">Lead (8+ Yrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Work Arrangement</label>
                    <select
                      value={formWorkArrangement}
                      onChange={(e) => setFormWorkArrangement(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    >
                      <option value="remote">Fully Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-Site</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Location</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Min Salary (INR / Annum)</label>
                    <input
                      type="number"
                      value={formSalaryMin}
                      onChange={(e) => setFormSalaryMin(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Max Salary (INR / Annum)</label>
                    <input
                      type="number"
                      value={formSalaryMax}
                      onChange={(e) => setFormSalaryMax(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* SKILL REQUIREMENTS BUILDER */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Required & Preferred Skill Profile
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Candidates will be evaluated and matched mathematically against these benchmarks.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedSkillToAdd}
                      onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-slate-200 text-xs"
                    >
                      <option value="">-- Choose skill from global taxonomy --</option>
                      {availableSkills.map(sk => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name} ({sk.domain_title})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addSkillToRequirement}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl"
                    >
                      Add Skill
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formSkills.map((req, idx) => {
                      const skillObj = availableSkills.find(s => s.id === req.skillId);
                      return (
                        <div key={req.skillId} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <span className="font-extrabold text-slate-800">
                            {skillObj?.name || req.skillId}
                          </span>

                          <div className="flex items-center gap-3">
                            <select
                              value={req.requirementType}
                              onChange={(e) => {
                                const copy = [...formSkills];
                                copy[idx].requirementType = e.target.value as any;
                                setFormSkills(copy);
                              }}
                              className="p-1 rounded border border-slate-200 text-[11px] font-bold"
                            >
                              <option value="required">Required</option>
                              <option value="preferred">Preferred</option>
                            </select>

                            <div className="flex items-center gap-1 text-[11px]">
                              <span>Target:</span>
                              <select
                                value={req.targetProficiency}
                                onChange={(e) => {
                                  const copy = [...formSkills];
                                  copy[idx].targetProficiency = Number(e.target.value);
                                  setFormSkills(copy);
                                }}
                                className="p-1 rounded border border-slate-200 font-bold"
                              >
                                {[1, 2, 3, 4, 5].map(lvl => (
                                  <option key={lvl} value={lvl}>L{lvl}</option>
                                ))}
                              </select>
                            </div>

                            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!req.assessmentRequired}
                                onChange={(e) => {
                                  const copy = [...formSkills];
                                  copy[idx].assessmentRequired = e.target.checked;
                                  setFormSkills(copy);
                                }}
                                className="rounded text-indigo-600"
                              />
                              <span>Must Assess</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => setFormSkills(formSkills.filter(s => s.skillId !== req.skillId))}
                              className="text-rose-500 hover:text-rose-700 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="indigo"
                  size="md"
                >
                  {editingJobId ? 'Save Changes' : 'Publish Opportunity'}
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
