import React, { useState, useEffect, useMemo } from 'react';
import {
  GitMerge,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Archive,
  ArrowRight,
  ExternalLink,
  Upload,
  Download,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { adminApi, useAdminQuery } from '../../../services/adminApi';
import { Tabs } from '../../../components/admin';

export const AdminContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'skills' | 'merge' | 'benchmarks' | 'resources'>('skills');

  // Domains & Skills state
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchSkill, setSearchSkill] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);
  const [isSkillDrawerOpen, setIsSkillDrawerOpen] = useState(false);
  const [isNewSkillModalOpen, setIsNewSkillModalOpen] = useState(false);
  const [newSkillForm, setNewSkillForm] = useState({
    name: '',
    domainId: 'dom-frontend',
    category: 'General',
    description: '',
    proficiencyScale: '1-5',
  });
  const [newAliasText, setNewAliasText] = useState('');

  // Duplicates state
  const [selectedDuplicatePair, setSelectedDuplicatePair] = useState<any | null>(null);
  const [mergeStep, setMergeStep] = useState<1 | 2 | 3>(1);
  const [survivorId, setSurvivorId] = useState<string>('');
  const [mergeDryRunResult, setMergeDryRunResult] = useState<any | null>(null);
  const [mergeReason, setMergeReason] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  // Benchmarks state
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
  const [benchmarkEditorData, setBenchmarkEditorData] = useState<any | null>(null);
  const [isSavingBenchmark, setIsSavingBenchmark] = useState(false);
  const [benchmarkSaveSuccess, setBenchmarkSaveSuccess] = useState(false);

  // Resources state
  const [searchResource, setSearchResource] = useState<string>('');
  const [filterResourceStatus, setFilterResourceStatus] = useState<string>('all');
  const [isCheckingAllLinks, setIsCheckingAllLinks] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch Domains
  const { data: domainsData } = useAdminQuery(
    (signal) => adminApi.getDomains(signal),
    []
  );

  // Fetch Skills
  const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useAdminQuery(
    (signal) =>
      adminApi.getSkills(
        {
          q: searchSkill,
          domain: selectedDomain === 'all' ? undefined : selectedDomain,
          pageSize: 50,
        },
        signal
      ),
    [searchSkill, selectedDomain]
  );

  // Fetch Duplicates
  const { data: duplicatesData, refetch: refetchDuplicates } = useAdminQuery(
    (signal) => adminApi.getDuplicateSkills(signal),
    [activeTab]
  );

  // Fetch Benchmarks
  const { data: benchmarksData, refetch: refetchBenchmarks } = useAdminQuery(
    (signal) => adminApi.getBenchmarks(signal),
    [activeTab]
  );

  // Fetch Resources
  const { data: resourcesData, loading: resourcesLoading, refetch: refetchResources } = useAdminQuery(
    (signal) =>
      adminApi.getResources(
        {
          q: searchResource,
          linkStatus: filterResourceStatus === 'all' ? undefined : filterResourceStatus,
          pageSize: 50,
        },
        signal
      ),
    [searchResource, filterResourceStatus, activeTab]
  );

  // Load benchmark detail into editor
  useEffect(() => {
    if (selectedBenchmarkId) {
      adminApi.getBenchmark(selectedBenchmarkId).then((res) => {
        setBenchmarkEditorData(res.benchmark);
      });
    } else if (benchmarksData?.benchmarks && benchmarksData.benchmarks.length > 0) {
      setSelectedBenchmarkId(benchmarksData.benchmarks[0].id);
    }
  }, [selectedBenchmarkId, benchmarksData]);

  // Skill row click
  const handleOpenSkill = async (skill: any) => {
    try {
      const full = await adminApi.getSkill(skill.id);
      setSelectedSkill(full.skill);
      setIsSkillDrawerOpen(true);
    } catch {
      setSelectedSkill(skill);
      setIsSkillDrawerOpen(true);
    }
  };

  // Add Alias
  const handleAddAlias = async () => {
    if (!selectedSkill || !newAliasText.trim()) return;
    try {
      await adminApi.addSkillAlias(selectedSkill.id, newAliasText.trim());
      setNewAliasText('');
      const full = await adminApi.getSkill(selectedSkill.id);
      setSelectedSkill(full.skill);
      refetchSkills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove Alias
  const handleRemoveAlias = async (aliasId: string) => {
    if (!selectedSkill) return;
    try {
      await adminApi.removeSkillAlias(selectedSkill.id, aliasId);
      const full = await adminApi.getSkill(selectedSkill.id);
      setSelectedSkill(full.skill);
      refetchSkills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Archive Skill
  const handleArchiveSkill = async (id: string) => {
    if (!confirm('Are you sure you want to archive this skill?')) return;
    try {
      await adminApi.archiveSkill(id);
      setIsSkillDrawerOpen(false);
      refetchSkills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Permanently delete this unreferenced skill?')) return;
    try {
      await adminApi.deleteSkill(id);
      setIsSkillDrawerOpen(false);
      refetchSkills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Skill
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createSkill(newSkillForm);
      setIsNewSkillModalOpen(false);
      setNewSkillForm({ name: '', domainId: 'dom-frontend', category: 'General', description: '', proficiencyScale: '1-5' });
      refetchSkills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Start merge dialog
  const handleStartMerge = (pair: any) => {
    setSelectedDuplicatePair(pair);
    setSurvivorId(pair.skillA.id);
    setMergeStep(1);
    setMergeDryRunResult(null);
    setMergeReason(`Resolving duplicate skills: '${pair.skillA.name}' and '${pair.skillB.name}'`);
  };

  // Merge step 1 -> step 2 (execute dry-run)
  const handlePreviewMerge = async () => {
    if (!selectedDuplicatePair || !survivorId) return;
    const isASurvivor = survivorId === selectedDuplicatePair.skillA.id;
    const sourceId = isASurvivor ? selectedDuplicatePair.skillB.id : selectedDuplicatePair.skillA.id;
    const targetId = survivorId;

    try {
      setIsMerging(true);
      const dryRun = await adminApi.mergeSkills({
        sourceId,
        targetId,
        dryRun: true,
      });
      setMergeDryRunResult(dryRun);
      setMergeStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMerging(false);
    }
  };

  // Execute real merge
  const handleExecuteMerge = async () => {
    if (!selectedDuplicatePair || !survivorId) return;
    const isASurvivor = survivorId === selectedDuplicatePair.skillA.id;
    const sourceId = isASurvivor ? selectedDuplicatePair.skillB.id : selectedDuplicatePair.skillA.id;
    const targetId = survivorId;

    try {
      setIsMerging(true);
      await adminApi.mergeSkills({
        sourceId,
        targetId,
        reason: mergeReason,
        dryRun: false,
      });
      setSelectedDuplicatePair(null);
      refetchDuplicates();
      refetchSkills();
      alert('Skills successfully merged!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMerging(false);
    }
  };

  // Benchmark skill weight/level change
  const handleBenchmarkSkillChange = (skillId: string, field: 'targetLevel' | 'weight', val: number) => {
    if (!benchmarkEditorData) return;
    setBenchmarkEditorData({
      ...benchmarkEditorData,
      requiredSkills: benchmarkEditorData.requiredSkills.map((s: any) =>
        s.skillId === skillId ? { ...s, [field]: val } : s
      ),
    });
  };

  // Save Benchmark
  const handleSaveBenchmark = async () => {
    if (!benchmarkEditorData) return;
    try {
      setIsSavingBenchmark(true);
      await adminApi.saveBenchmark(benchmarkEditorData);
      setBenchmarkSaveSuccess(true);
      setTimeout(() => setBenchmarkSaveSuccess(false), 3000);
      refetchBenchmarks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingBenchmark(false);
    }
  };

  // Single link check
  const handleCheckLink = async (id: string) => {
    try {
      await adminApi.checkResourceLink(id);
      refetchResources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Check all links
  const handleCheckAllLinks = async () => {
    try {
      setIsCheckingAllLinks(true);
      const res = await adminApi.checkAllResourceLinks();
      alert(`Completed checking ${res.total} resources. ${res.errors} faulty links detected.`);
      refetchResources();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCheckingAllLinks(false);
    }
  };

  // Preview import JSON
  const handlePreviewImport = async () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const res = await adminApi.importResources(items, true);
      setImportPreview(res);
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON format');
    }
  };

  // Commit import JSON
  const handleCommitImport = async () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      await adminApi.importResources(items, false);
      setIsImportModalOpen(false);
      setImportJsonText('');
      setImportPreview(null);
      refetchResources();
      alert('Resources successfully imported!');
    } catch (err: any) {
      setImportError(err.message);
    }
  };

  // Radar chart data for benchmark preview
  const radarChartData = useMemo(() => {
    if (!benchmarkEditorData?.requiredSkills) return [];
    return benchmarkEditorData.requiredSkills.map((s: any) => ({
      skill: s.skillName || s.skillId,
      level: s.targetLevel || 3,
      weight: s.weight || 1.0,
      fullMark: 5,
    }));
  }, [benchmarkEditorData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Content Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Maintain the canonical skill taxonomy, deduplicate terms, calibrate role benchmarks, and audit learning resources.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'skills', label: 'Skills Catalog' },
          {
            id: 'merge',
            label: 'Merge Duplicates',
            count: duplicatesData?.duplicates?.length || 0,
          },
          { id: 'benchmarks', label: 'Role Benchmarks' },
          { id: 'resources', label: 'Learning Resources' },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {/* ================= TAB 1: SKILLS ================= */}
      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Domain list */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2 h-fit">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Taxonomy Domains
            </h3>
            <button
              onClick={() => setSelectedDomain('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                selectedDomain === 'all'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>All Domains</span>
              <span className="text-xs text-gray-400 font-normal">
                {domainsData?.domains?.reduce((acc, d) => acc + (d.skill_count || 0), 0) || 0}
              </span>
            </button>
            {domainsData?.domains?.map((dom) => (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(dom.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  selectedDomain === dom.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate pr-2">{dom.title}</span>
                <span className="text-xs text-gray-400 font-normal">{dom.skill_count || 0}</span>
              </button>
            ))}
          </div>

          {/* Right: Skills table */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search skills by name, alias or category..."
                  value={searchSkill}
                  onChange={(e) => setSearchSkill(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setIsNewSkillModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Skill Name</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Aliases</th>
                    <th className="py-3 px-4">Platform Usage</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {skillsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Loading taxonomy catalog...
                      </td>
                    </tr>
                  ) : skillsData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No skills match your filters.
                      </td>
                    </tr>
                  ) : (
                    skillsData?.items?.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenSkill(item)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-gray-600">{item.domain_title || item.domain_id}</td>
                        <td className="py-3 px-4 text-gray-500">{item.category}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.aliases && item.aliases.length > 0 ? (
                              item.aliases.map((al: string) => (
                                <span
                                  key={al}
                                  className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  {al}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.usageCount > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.usageCount} refs
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.is_archived === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                              Archived
                            </span>
                          ) : item.active === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MERGE DUPLICATES ================= */}
      {activeTab === 'merge' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Automated Taxonomy Deduplication</p>
              <p className="text-amber-700 mt-0.5">
                The engine continuously checks for normalized name collisions and Levenshtein edit distance &le; 2 within the same domain.
                Merging repoints candidate profiles, job requirements, test questions, and preserves searchability via automatic alias creation.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Detected Candidate Pair</th>
                  <th className="py-3 px-4">Match Similarity</th>
                  <th className="py-3 px-4">Usage Counts</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {duplicatesData?.duplicates?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      Clean catalog! No duplicate skills detected across domains.
                    </td>
                  </tr>
                ) : (
                  duplicatesData?.duplicates?.map((dup: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-600">{dup.domainTitle || dup.domainId}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-700">{dup.skillA.name}</span>
                          <span className="text-gray-400">&harr;</span>
                          <span className="font-semibold text-indigo-700">{dup.skillB.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          {dup.matchType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {dup.skillA.name}: {dup.skillA.usage} refs | {dup.skillB.name}: {dup.skillB.usage} refs
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleStartMerge(dup)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          Resolve Merge
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ROLE BENCHMARKS ================= */}
      {activeTab === 'benchmarks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2 h-fit">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Career Roles
            </h3>
            {benchmarksData?.benchmarks?.map((bm: any) => (
              <button
                key={bm.id}
                onClick={() => setSelectedBenchmarkId(bm.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  selectedBenchmarkId === bm.id
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-semibold">{bm.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{bm.domain_title || bm.domain_id}</div>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {bm.skill_count} skills
                </span>
              </button>
            ))}
          </div>

          {/* Benchmark Editor & Radar Preview */}
          <div className="lg:col-span-2 space-y-6">
            {benchmarkEditorData ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{benchmarkEditorData.roleTitle}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{benchmarkEditorData.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {benchmarkSaveSuccess && (
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Saved & Applied
                      </span>
                    )}
                    <button
                      onClick={handleSaveBenchmark}
                      disabled={isSavingBenchmark}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {isSavingBenchmark ? 'Saving...' : 'Save Benchmark'}
                    </button>
                  </div>
                </div>

                {/* Radar chart preview */}
                <div className="bg-gray-50/75 rounded-xl border border-gray-200/60 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 text-center">
                    Live Target Competency Radar (Skill Gap Calibrator)
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#4B5563', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#9CA3AF" />
                        <Radar
                          name="Target Proficiency"
                          dataKey="level"
                          stroke="#4F46E5"
                          fill="#4F46E5"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Skills calibration list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Required Competencies & Weighting
                  </h4>
                  <div className="space-y-2">
                    {benchmarkEditorData.requiredSkills?.map((s: any) => (
                      <div
                        key={s.skillId}
                        className="p-3 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                      >
                        <div>
                          <span className="font-semibold text-gray-900">{s.skillName}</span>
                          <span className="text-xs text-gray-400 block">{s.category}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Target Level:</span>
                            <select
                              value={s.targetLevel || 3}
                              onChange={(e) =>
                                handleBenchmarkSkillChange(s.skillId, 'targetLevel', Number(e.target.value))
                              }
                              className="border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                            >
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  Level {lvl}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Weight:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="5"
                              value={s.weight || 1.0}
                              onChange={(e) =>
                                handleBenchmarkSkillChange(s.skillId, 'weight', parseFloat(e.target.value) || 1.0)
                              }
                              className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                Select a career role to inspect its benchmark.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: LEARNING RESOURCES ================= */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources by title, provider..."
                  value={searchResource}
                  onChange={(e) => setSearchResource(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterResourceStatus}
                onChange={(e) => setFilterResourceStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Link Statuses</option>
                <option value="ok">Valid (200 OK)</option>
                <option value="error">Dead / Failed</option>
                <option value="untested">Untested</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckAllLinks}
                disabled={isCheckingAllLinks}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingAllLinks ? 'animate-spin' : ''}`} />
                Check All Links
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
              >
                <Upload className="w-4 h-4" />
                Import JSON
              </button>
              <a
                href="/api/admin/content/resources/export.json"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                <Download className="w-4 h-4" />
                Export
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Provider</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Link Status</th>
                  <th className="py-3 px-4">Last Verified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resourcesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Loading catalog resources...
                    </td>
                  </tr>
                ) : resourcesData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No resources found.
                    </td>
                  </tr>
                ) : (
                  resourcesData?.items?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{r.title}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>{r.provider}</span>
                          <span>&bull;</span>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-0.5"
                          >
                            Visit <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{r.domain}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs capitalize">{r.type}</td>
                      <td className="py-3 px-4">
                        {r.link_status === 'ok' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Valid ({r.link_status_code || 200})
                          </span>
                        ) : r.link_status === 'blocked' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            SSRF Blocked
                          </span>
                        ) : r.link_status === 'http_error' || r.link_status === 'fetch_failed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Broken
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Untested
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {r.last_checked_at ? new Date(r.last_checked_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleCheckLink(r.id)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition"
                        >
                          Check Link
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SKILL DETAIL DRAWER ================= */}
      {isSkillDrawerOpen && selectedSkill && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedSkill.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedSkill.id}</p>
              </div>
              <button onClick={() => setIsSkillDrawerOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Usage inspection */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Live Entity References
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-gray-400 block">Candidate Profiles</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {selectedSkill.usage?.breakdown?.candidateSkills || 0}
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-gray-400 block">Job Postings</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {selectedSkill.usage?.breakdown?.jobRequirements || 0}
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-gray-400 block">Test Questions</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {selectedSkill.usage?.breakdown?.questions || 0}
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-gray-400 block">Role Benchmarks</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {selectedSkill.usage?.breakdown?.benchmarkSkills || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Aliases Manager */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Search Aliases
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedSkill.aliases?.map((al: any) => (
                  <span
                    key={al.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
                  >
                    {al.alias}
                    <button
                      onClick={() => handleRemoveAlias(al.id)}
                      className="text-indigo-400 hover:text-indigo-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Add synonym alias..."
                  value={newAliasText}
                  onChange={(e) => setNewAliasText(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddAlias}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-gray-100 space-y-2">
              <button
                onClick={() => handleArchiveSkill(selectedSkill.id)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <Archive className="w-4 h-4" />
                Archive Skill
              </button>
              <button
                onClick={() => handleDeleteSkill(selectedSkill.id)}
                disabled={selectedSkill.usage?.totalUsage > 0}
                className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete Skill (Zero Usage Only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MERGE 3-STEP DIALOG ================= */}
      {selectedDuplicatePair && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Merge Duplicate Skills</h3>
                <p className="text-xs text-gray-500">Step {mergeStep} of 3</p>
              </div>
              <button onClick={() => setSelectedDuplicatePair(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Survivor */}
            {mergeStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select which canonical skill should survive. The other skill will be soft-archived, and its name will become an alias of the survivor.
                </p>
                <div className="space-y-2">
                  <label
                    className={`block p-3 border rounded-xl cursor-pointer transition ${
                      survivorId === selectedDuplicatePair.skillA.id
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="survivor"
                      checked={survivorId === selectedDuplicatePair.skillA.id}
                      onChange={() => setSurvivorId(selectedDuplicatePair.skillA.id)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-gray-900">{selectedDuplicatePair.skillA.name}</div>
                    <div className="text-xs text-gray-500">
                      ID: {selectedDuplicatePair.skillA.id} &bull; {selectedDuplicatePair.skillA.usage} active refs
                    </div>
                  </label>
                  <label
                    className={`block p-3 border rounded-xl cursor-pointer transition ${
                      survivorId === selectedDuplicatePair.skillB.id
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="survivor"
                      checked={survivorId === selectedDuplicatePair.skillB.id}
                      onChange={() => setSurvivorId(selectedDuplicatePair.skillB.id)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-gray-900">{selectedDuplicatePair.skillB.name}</div>
                    <div className="text-xs text-gray-500">
                      ID: {selectedDuplicatePair.skillB.id} &bull; {selectedDuplicatePair.skillB.usage} active refs
                    </div>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setSelectedDuplicatePair(null)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreviewMerge}
                    disabled={isMerging}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    Next: Impact Preview <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Impact Preview */}
            {mergeStep === 2 && mergeDryRunResult && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Exact dry-run impact calculation across all database tables:
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-gray-200/60 font-semibold text-gray-700">
                    <span>Table</span>
                    <span>Repointed Rows</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Candidate Verified Skills</span>
                    <span className="font-semibold">{mergeDryRunResult.affectedRows?.candidateSkills || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Job Skill Requirements</span>
                    <span className="font-semibold">{mergeDryRunResult.affectedRows?.jobRequirements || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assessment Questions</span>
                    <span className="font-semibold">{mergeDryRunResult.affectedRows?.questions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role Benchmark Skills</span>
                    <span className="font-semibold">{mergeDryRunResult.affectedRows?.benchmarkSkills || 0}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-gray-900">
                    <span>Total Entities Repointed</span>
                    <span>{mergeDryRunResult.totalAffected || 0}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Audit Reason / Justification</label>
                  <input
                    type="text"
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setMergeStep(1)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExecuteMerge}
                    disabled={isMerging}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isMerging ? 'Merging Atomic Transaction...' : 'Confirm & Execute Merge'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= NEW SKILL MODAL ================= */}
      {isNewSkillModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSkill}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create Taxonomy Skill</h3>
              <button
                type="button"
                onClick={() => setIsNewSkillModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Skill Name *</label>
                <input
                  type="text"
                  required
                  value={newSkillForm.name}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, name: e.target.value })}
                  placeholder="e.g. Kubernetes Orchestration"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Domain *</label>
                <select
                  value={newSkillForm.domainId}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, domainId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {domainsData?.domains?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newSkillForm.category}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newSkillForm.description}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsNewSkillModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Create Skill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= IMPORT RESOURCES MODAL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Import Learning Resources</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Paste JSON array of resources (max 500 rows). Must include <code>title</code>, <code>url</code>, and <code>domain</code>. All-or-nothing validation ensures data integrity.
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='[ { "title": "TypeScript Docs", "url": "https://www.typescriptlang.org", "domain": "dom-frontend" } ]'
              className="w-full font-mono text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {importError}
              </div>
            )}

            {importPreview && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                Validation passed! Ready to import {importPreview.total} resources.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreviewImport}
                className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Validate Preview
              </button>
              <button
                onClick={handleCommitImport}
                disabled={!importPreview}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Commit Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContentPage;
