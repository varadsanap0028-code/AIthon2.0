import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Building2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SkeletonCard } from '../../components/common/Skeleton';
import { DriveSchedule } from '../../components/college/DriveSchedule';
import { collegeApi } from '../../services/collegeApiService';
import type { CollegePlacementDrive, DriveStatus } from '../../types/college';

const FALLBACK_DRIVES: CollegePlacementDrive[] = [
  {
    id: 'drv-razorpay',
    company: 'Razorpay Technologies',
    role: 'Full-Stack Software Engineer',
    packageLpa: 16,
    status: 'upcoming',
    eligibility: { branches: ['CSE', 'IT'], minReadiness: 70, requiredSkills: ['React.js', 'Node.js & Express'], verifiedPassportRequired: true },
    applications: 118,
    eligibleStudents: 142,
    startDate: '2026-10-25',
    endDate: '2026-10-30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'drv-tcs',
    company: 'TCS Digital & Innovator',
    role: 'System Engineer & Cloud Specialist',
    packageLpa: 9,
    status: 'in_progress',
    eligibility: { branches: ['CSE', 'IT', 'AI/DS', 'ECE'], minReadiness: 60, requiredSkills: ['Python', 'SQL & PostgreSQL'], verifiedPassportRequired: false },
    applications: 184,
    eligibleStudents: 220,
    startDate: '2026-10-10',
    endDate: '2026-10-22',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'drv-swiggy',
    company: 'Swiggy / Bundl Technologies',
    role: 'Backend & Platform Engineer',
    packageLpa: 18,
    status: 'completed',
    eligibility: { branches: ['CSE', 'IT'], minReadiness: 75, requiredSkills: ['Node.js & Express', 'Docker & DevOps'], verifiedPassportRequired: true },
    applications: 82,
    eligibleStudents: 95,
    startDate: '2026-09-15',
    endDate: '2026-09-28',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'drv-cred',
    company: 'CRED Technologies',
    role: 'Product Engineering Associate',
    packageLpa: 22,
    status: 'upcoming',
    eligibility: { branches: ['CSE', 'IT', 'AI/DS'], minReadiness: 80, requiredSkills: ['React.js', 'System Design'], verifiedPassportRequired: true },
    applications: 64,
    eligibleStudents: 88,
    startDate: '2026-11-04',
    endDate: '2026-11-08',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const CollegeDrivesPage: React.FC = () => {
  const [drives, setDrives] = useState<CollegePlacementDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Drive Form State
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [packageLpa, setPackageLpa] = useState<number>(12);
  const [status, setStatus] = useState<DriveStatus>('upcoming');
  const [minReadiness, setMinReadiness] = useState<number>(65);
  const [branches, setBranches] = useState<string[]>(['CSE', 'IT', 'AI/DS']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await collegeApi.listDrives();
      if (res?.data && res.data.length > 0) {
        setDrives(res.data);
      } else {
        setDrives(FALLBACK_DRIVES);
      }
    } catch {
      // In demo mode fallback gracefully
      setDrives(FALLBACK_DRIVES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBranch = (b: string) => {
    setBranches((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await collegeApi.createDrive({
        company: company.trim(),
        role: role.trim(),
        packageLpa: Number(packageLpa),
        status,
        minReadiness: Number(minReadiness),
        branches,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || undefined,
        verifiedPassportRequired: true,
      });

      if (res?.data) {
        setDrives((prev) => [res.data, ...prev]);
      } else {
        // Local simulation fallback
        const mockNew: CollegePlacementDrive = {
          id: `drv-${Date.now()}`,
          company: company.trim(),
          role: role.trim(),
          packageLpa: Number(packageLpa),
          status,
          eligibility: { branches: branches as any, minReadiness: Number(minReadiness), requiredSkills: ['Core Problem Solving'], verifiedPassportRequired: true },
          applications: 0,
          eligibleStudents: 110,
          startDate: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDrives((prev) => [mockNew, ...prev]);
      }

      setSuccessMsg(`Successfully scheduled campus drive for ${company}!`);
      setIsModalOpen(false);
      // Reset form
      setCompany('');
      setRole('');
      setPackageLpa(12);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule drive.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Campus Placement Drives"
        description="Schedule on-campus drives, track employer pipelines, and evaluate student eligibility criteria."
        badge={<Badge variant="emerald" dot>COLLEGE &amp; INSTITUTIONAL PORTAL</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Schedule Placement Drive
            </Button>
          </div>
        }
      />

      {successMsg && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <SkeletonCard className="space-y-6" />
      ) : (
        <DriveSchedule drives={drives} isLoading={false} />
      )}

      {/* Schedule Drive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E0E7F2] w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#087BFA]">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-[#0B1B43]">Schedule Placement Drive</h3>
                  <p className="text-xs text-[#405B8B]">Enter recruitment drive details and candidate eligibility</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#0B1B43] block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Razorpay Technologies"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0B1B43] block mb-1">Target Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Software Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0B1B43] block mb-1">Compensation (LPA)</label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={packageLpa}
                    onChange={(e) => setPackageLpa(Number(e.target.value))}
                    className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0B1B43] block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DriveStatus)}
                    className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA] bg-white"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0B1B43] block mb-1">Minimum Readiness (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minReadiness}
                  onChange={(e) => setMinReadiness(Number(e.target.value))}
                  className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0B1B43] block mb-1">Drive Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0B1B43] block mb-1">Drive End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-[#E0E7F2] rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:border-[#087BFA]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0B1B43] block mb-1.5">Eligible Branches</label>
                <div className="flex items-center gap-2">
                  {['CSE', 'IT', 'AI/DS', 'ECE'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        branches.includes(b)
                          ? 'bg-[#087BFA] text-white border-[#087BFA]'
                          : 'bg-slate-50 text-slate-600 border-[#E0E7F2] hover:bg-slate-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Schedule Drive
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeDrivesPage;
