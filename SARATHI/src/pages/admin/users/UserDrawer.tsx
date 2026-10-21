import React, { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { Drawer, Tabs, StatusDot, ConfirmDialog, Skeleton } from '../../../components/admin';
import { adminApi, type AdminUserDetailResponse, type AdminMeResponse } from '../../../services/adminApi';

export interface UserDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminMeResponse | null;
  onUserMutated: () => void;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  currentUser,
  onUserMutated,
}) => {
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Dialog states
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    targetStatus: 'active' | 'suspended';
  }>({ isOpen: false, targetStatus: 'suspended' });
  const [statusLoading, setStatusLoading] = useState(false);

  const [roleSelect, setRoleSelect] = useState<string>('');
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessLink, setResetSuccessLink] = useState<string | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  const isSelf = currentUser && detail && currentUser.id === detail.user.id;

  const fetchDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUserDetail(id);
      setDetail(data);
      setRoleSelect(data.user.role);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      setActiveTab('overview');
      setResetSuccessLink(null);
      fetchDetail(userId);
    } else {
      setDetail(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleStatusConfirm = async (reason?: string) => {
    if (!detail) return;
    setStatusLoading(true);
    try {
      await adminApi.updateUserStatus(detail.user.id, {
        status: statusDialog.targetStatus,
        reason: reason || '',
      });
      setStatusDialog({ isOpen: false, targetStatus: 'suspended' });
      await fetchDetail(detail.user.id);
      onUserMutated();
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRoleConfirm = async () => {
    if (!detail || !roleSelect || roleSelect === detail.user.role) return;
    setRoleLoading(true);
    try {
      const res = await adminApi.updateUserRole(detail.user.id, {
        role: roleSelect,
        reason: 'Role updated in user management drawer',
      });
      if (res.warning) {
        alert(`Note: ${res.warning}`);
      }
      setRoleConfirmOpen(false);
      await fetchDetail(detail.user.id);
      onUserMutated();
    } catch (err: any) {
      alert(err?.message || 'Failed to change user role.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleForcePasswordReset = async () => {
    if (!detail) return;
    setResetLoading(true);
    setResetSuccessLink(null);
    try {
      const res = await adminApi.forcePasswordReset(detail.user.id);
      if (res.resetLink) {
        setResetSuccessLink(res.resetLink);
      } else {
        alert(res.message || 'Password reset instructions have been triggered.');
      }
      await fetchDetail(detail.user.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to force password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyResetLink = () => {
    if (resetSuccessLink) {
      const fullUrl = `${window.location.origin}${resetSuccessLink}`;
      navigator.clipboard.writeText(fullUrl);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'security', label: 'Security' },
    { id: 'history', label: 'History' },
  ];

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={detail ? detail.user.fullName : 'User Account'}
        subtitle={detail ? detail.user.email : 'Loading account profile...'}
      >
        {loading && !detail ? (
          <div className="p-6 space-y-4">
            <Skeleton width="60%" height={24} />
            <Skeleton width="100%" height={80} />
            <Skeleton width="100%" height={120} />
          </div>
        ) : error || !detail ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-[#DC2626]">{error || 'User not found.'}</p>
            <button
              type="button"
              onClick={() => userId && fetchDetail(userId)}
              className="mt-3 px-3 py-1.5 text-[12px] font-medium text-white bg-[#4F46E5] rounded-[6px]"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* User Header Summary Badge */}
            <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-semibold text-[14px] flex items-center justify-center border border-[#E0E7FF]">
                  {detail.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#111827]">
                      {detail.user.fullName}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#E5E7EB] rounded-full text-[#374151] capitalize">
                      {detail.user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#6B7280]">{detail.user.email}</span>
                </div>
              </div>
              <StatusDot
                status={detail.user.status === 'active' ? 'success' : 'danger'}
                label={detail.user.status === 'active' ? 'Active' : 'Suspended'}
              />
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 pt-3 bg-white">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Account Metadata */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 space-y-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Account Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <span className="text-[#6B7280] block">User ID</span>
                        <span className="font-mono text-[#111827]">{detail.user.id}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Email Verification</span>
                        <span className={detail.user.emailVerified ? 'text-[#16A34A] font-medium' : 'text-[#D97706]'}>
                          {detail.user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Date Joined</span>
                        <span className="text-[#111827]">
                          {new Date(detail.user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Last Login</span>
                        <span className="text-[#111827]">
                          {detail.user.lastLoginAt
                            ? new Date(detail.user.lastLoginAt).toLocaleString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Summary */}
                  {detail.profile && (
                    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 space-y-3">
                      <h3 className="text-[14px] font-semibold text-[#111827]">
                        {detail.user.role === 'candidate' ? 'Candidate Profile' : 'Recruiter Profile'}
                      </h3>
                      <div className="space-y-2 text-[13px]">
                        {detail.profile.headline && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Headline</span>
                            <span className="text-[#111827] font-medium">{detail.profile.headline}</span>
                          </div>
                        )}
                        {detail.profile.target_role && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Target Role</span>
                            <span className="text-[#111827]">{detail.profile.target_role}</span>
                          </div>
                        )}
                        {detail.profile.title && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Title</span>
                            <span className="text-[#111827]">{detail.profile.title}</span>
                          </div>
                        )}
                        {detail.profile.department && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Department</span>
                            <span className="text-[#111827]">{detail.profile.department}</span>
                          </div>
                        )}
                        {detail.profile.experience_years !== undefined && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Experience</span>
                            <span className="text-[#111827]">{detail.profile.experience_years} years</span>
                          </div>
                        )}
                        {detail.profile.location && (
                          <div>
                            <span className="text-[11px] text-[#6B7280] block">Location</span>
                            <span className="text-[#111827]">{detail.profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Organisation Memberships */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 space-y-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Organisation Memberships</h3>
                    {detail.organisations.length === 0 ? (
                      <p className="text-[12px] text-[#6B7280]">No affiliated organisations.</p>
                    ) : (
                      <div className="divide-y divide-[#F3F4F6]">
                        {detail.organisations.map((org) => (
                          <div key={org.id} className="py-2 flex items-center justify-between text-[12px]">
                            <div>
                              <span className="font-medium text-[#111827]">{org.name}</span>
                              <span className="text-[#6B7280] text-[11px] block font-mono">/{org.slug}</span>
                            </div>
                            <span className="capitalize px-2 py-0.5 bg-[#F3F4F6] text-[#374151] rounded-[4px]">
                              {org.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Linked SSO Providers */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 space-y-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Linked Sign-in Providers</h3>
                    {detail.identities.length === 0 ? (
                      <p className="text-[12px] text-[#6B7280]">Email and password only. No OAuth links.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.identities.map((id, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[12px] p-2 bg-[#F9FAFB] rounded-[6px]">
                            <span className="font-medium text-[#111827] capitalize">{id.provider}</span>
                            <span className="text-[#6B7280]">{id.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVITY */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-[8px]">
                      <span className="text-[12px] text-[#6B7280] block">Applications</span>
                      <span className="text-[22px] font-bold text-[#111827] mt-1 block">
                        {detail.counts.applications.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-[8px]">
                      <span className="text-[12px] text-[#6B7280] block">Test Sessions</span>
                      <span className="text-[22px] font-bold text-[#111827] mt-1 block">
                        {detail.counts.tests.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-[8px]">
                      <span className="text-[12px] text-[#6B7280] block">Jobs Posted</span>
                      <span className="text-[22px] font-bold text-[#111827] mt-1 block">
                        {detail.counts.jobs.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-[8px]">
                      <span className="text-[12px] text-[#6B7280] block">Support Tickets</span>
                      <span className="text-[22px] font-bold text-[#111827] mt-1 block">
                        {detail.counts.tickets.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY & ACTIONS */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Account Actions Section */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 space-y-5">
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#111827]">Account Actions</h3>
                      <p className="text-[12px] text-[#6B7280] mt-0.5">
                        Sensitive controls affecting platform access, privileges, and credentials
                      </p>
                    </div>

                    {/* Suspend / Activate Action */}
                    <div className="pt-4 border-t border-[#F3F4F6] flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[13px] font-medium text-[#111827] block">
                          Account Status
                        </span>
                        <span className="text-[12px] text-[#6B7280]">
                          {detail.user.status === 'active'
                            ? 'Suspension immediately terminates live user sessions.'
                            : 'Re-activating restores access immediately.'}
                        </span>
                      </div>

                      <div className="shrink-0 relative group">
                        <button
                          type="button"
                          disabled={Boolean(isSelf)}
                          onClick={() =>
                            setStatusDialog({
                              isOpen: true,
                              targetStatus: detail.user.status === 'active' ? 'suspended' : 'active',
                            })
                          }
                          className={`px-3.5 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                            detail.user.status === 'active'
                              ? 'text-[#DC2626] border border-[#DC2626] hover:bg-[#FEF2F2]'
                              : 'text-[#16A34A] border border-[#16A34A] hover:bg-[#F0FDF4]'
                          }`}
                        >
                          {detail.user.status === 'active' ? 'Suspend User' : 'Activate User'}
                        </button>
                        {isSelf && (
                          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-[#111827] text-white text-[11px] rounded-[4px] shadow-lg z-30 pointer-events-none">
                            You cannot suspend your own account.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Change Role Action */}
                    <div className="pt-4 border-t border-[#F3F4F6] space-y-3">
                      <div>
                        <span className="text-[13px] font-medium text-[#111827] block">Platform Role</span>
                        <span className="text-[12px] text-[#6B7280]">
                          Elevate to administrator or reassign permissions across domains
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          disabled={Boolean(isSelf)}
                          value={roleSelect}
                          onChange={(e) => setRoleSelect(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[6px] bg-white disabled:opacity-50"
                        >
                          <option value="candidate">Candidate (Student / Jobseeker)</option>
                          <option value="recruiter">Recruiter (Employer)</option>
                          <option value="college">College (Institutional Admin)</option>
                          <option value="reviewer">Reviewer (Technical Evaluator)</option>
                          <option value="platform_admin">Platform Admin (Superuser)</option>
                        </select>

                        <button
                          type="button"
                          disabled={Boolean(isSelf) || roleSelect === detail.user.role}
                          onClick={() => setRoleConfirmOpen(true)}
                          className="px-3.5 py-1.5 text-[12px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[6px] transition-colors disabled:opacity-50"
                        >
                          Change Role
                        </button>
                      </div>
                      {isSelf && (
                        <p className="text-[11px] text-[#6B7280]">
                          You cannot change the role of your own active account.
                        </p>
                      )}
                    </div>

                    {/* Force Password Reset */}
                    <div className="pt-4 border-t border-[#F3F4F6] space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[13px] font-medium text-[#111827] block">
                            Password Recovery
                          </span>
                          <span className="text-[12px] text-[#6B7280]">
                            Invalidates old tokens and issues a fresh one-time reset link
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={resetLoading}
                          onClick={handleForcePasswordReset}
                          className="px-3.5 py-1.5 text-[12px] font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[6px] transition-colors shrink-0 disabled:opacity-50"
                        >
                          {resetLoading ? 'Generating...' : 'Force Reset'}
                        </button>
                      </div>

                      {resetSuccessLink && (
                        <div className="p-3 bg-[#EEF2FF] border border-[#C7D2FE] rounded-[6px] space-y-2">
                          <p className="text-[12px] text-[#3730A3] font-medium">
                            One-time reset link generated:
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}${resetSuccessLink}`}
                              className="w-full px-2.5 py-1 text-[11px] bg-white border border-[#C7D2FE] rounded-[4px] font-mono select-all focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={handleCopyResetLink}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[4px] shrink-0"
                            >
                              {resetCopied ? <Check size={12} /> : <Copy size={12} />}
                              <span>{resetCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HISTORY (AUDIT LOG) */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#111827]">Audit Trail</h3>
                  {detail.recentAudit.length === 0 ? (
                    <p className="text-[12px] text-[#6B7280]">No administrative actions recorded for this user.</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.recentAudit.map((item) => (
                        <div key={item.id} className="p-3 bg-white border border-[#E5E7EB] rounded-[6px] text-[12px] space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-semibold text-[#4F46E5]">{item.action}</span>
                            <span className="text-[#6B7280]">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {item.reason && (
                            <p className="text-[#374151]">
                              <span className="font-medium text-[#111827]">Reason:</span> {item.reason}
                            </p>
                          )}
                          <span className="text-[11px] text-[#9CA3AF] block font-mono">
                            Admin: {item.adminId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Suspend / Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        onClose={() => setStatusDialog({ isOpen: false, targetStatus: 'suspended' })}
        onConfirm={handleStatusConfirm}
        title={statusDialog.targetStatus === 'suspended' ? 'Suspend User Account' : 'Re-activate User Account'}
        message={
          statusDialog.targetStatus === 'suspended'
            ? `Are you sure you want to suspend ${detail?.user.fullName}? They will be immediately logged out and forbidden from taking tests or accessing their account.`
            : `Re-activate ${detail?.user.fullName}? Their access will be restored immediately.`
        }
        confirmLabel={statusDialog.targetStatus === 'suspended' ? 'Suspend User' : 'Activate User'}
        isDestructive={statusDialog.targetStatus === 'suspended'}
        reasonRequired={statusDialog.targetStatus === 'suspended'}
        reasonPlaceholder="Mandatory reason for user account suspension..."
        isLoading={statusLoading}
      />

      {/* Role Change Confirm Dialog */}
      <ConfirmDialog
        isOpen={roleConfirmOpen}
        onClose={() => setRoleConfirmOpen(false)}
        onConfirm={handleRoleConfirm}
        title="Confirm Role Change"
        message={`Are you sure you want to change the role of ${detail?.user.fullName} from '${detail?.user.role}' to '${roleSelect}'? ${
          (detail?.user.role === 'candidate' && roleSelect === 'recruiter') ||
          (detail?.user.role === 'recruiter' && roleSelect === 'candidate')
            ? 'Warning: Profile data does not migrate between candidate and recruiter roles.'
            : ''
        }`}
        confirmLabel="Update Role"
        isLoading={roleLoading}
      />
    </>
  );
};

export default UserDrawer;
