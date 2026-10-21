import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';

export const RecruiterTeamPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [members, setMembers] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('recruiter');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await recruiterApi.getOrganizationMembers();
      setMembers(data);
    } catch (err: any) {
      showToast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeOrgId, refreshKey]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    try {
      setSubmitting(true);
      await recruiterApi.addOrganizationMember({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
      });
      showToast(`Invited ${fullName} as ${role}`, 'success');
      setIsInviteOpen(false);
      setEmail('');
      setFullName('');
      loadMembers();
    } catch (err: any) {
      showToast(err.message || 'Invitation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Team Members & Role Permissions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-tenant role-based access controls across recruiters, assessors, and reviewers.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                <th className="p-4">Member</th>
                <th className="p-4">RBAC Role</th>
                <th className="p-4">Membership Status</th>
                <th className="p-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      {m.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block">{m.full_name}</span>
                      <span className="text-[11px] text-slate-400">{m.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVITE MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Radhika Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="recruiter">Recruiter / Hiring Manager</option>
                  <option value="assessor">Technical Assessor (Code & Rubrics)</option>
                  <option value="reviewer">Read-Only Reviewer</option>
                  <option value="org_owner">Organization Owner</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
