import React, { useState, useEffect, useCallback } from 'react';
import { Download, UserPlus, X } from 'lucide-react';
import {
  PageHeader,
  FilterBar,
  DataTable,
  StatusDot,
  ConfirmDialog,
  useUrlState,
  downloadCsv,
  type Column,
  type FilterSelectConfig,
} from '../../../components/admin';
import { adminApi, type AdminUserItem, type AdminMeResponse } from '../../../services/adminApi';
import { UserDrawer } from './UserDrawer';
import { InviteStaffModal } from './InviteStaffModal';

export const AdminUsersPage: React.FC = () => {
  const { getParam, setParam, resetParams } = useUrlState({
    q: '',
    role: 'all',
    status: 'all',
    inactiveDays: '',
    page: '1',
    sort: 'createdAt',
    order: 'desc',
  });

  const q = getParam('q');
  const role = getParam('role');
  const status = getParam('status');
  const inactiveDays = getParam('inactiveDays');
  const page = parseInt(getParam('page') || '1', 10);
  const sort = getParam('sort') || 'createdAt';
  const order = (getParam('order') || 'desc') as 'asc' | 'desc';

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authenticated admin identity
  const [currentUser, setCurrentUser] = useState<AdminMeResponse | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer & Modal states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);

  // Bulk status confirm dialog
  const [bulkDialog, setBulkDialog] = useState<{
    isOpen: boolean;
    targetStatus: 'active' | 'suspended';
  }>({ isOpen: false, targetStatus: 'suspended' });
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Fetch current admin on mount
  useEffect(() => {
    adminApi.getMe().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        q,
        role: role === 'all' ? '' : role,
        status: status === 'all' ? '' : status,
        inactiveDays: inactiveDays || undefined,
        sort,
        order: order.toUpperCase() as 'ASC' | 'DESC',
        page,
        pageSize: 20,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  }, [q, role, status, inactiveDays, sort, order, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Selection handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  // Sort handler
  const handleSort = (columnKey: string) => {
    const nextOrder = sort === columnKey && order === 'asc' ? 'desc' : 'asc';
    setParam('sort', columnKey);
    setParam('order', nextOrder);
  };

  // Filter handlers
  const filterConfigs: FilterSelectConfig[] = [
    {
      key: 'role',
      label: 'Role',
      value: role,
      options: [
        { value: 'all', label: 'All Roles' },
        { value: 'candidate', label: 'Candidate' },
        { value: 'recruiter', label: 'Recruiter' },
        { value: 'college', label: 'College' },
        { value: 'reviewer', label: 'Reviewer' },
        { value: 'platform_admin', label: 'Admin' },
      ],
      onChange: (val) => {
        setParam('role', val);
        setParam('page', 1);
      },
    },
    {
      key: 'status',
      label: 'Status',
      value: status,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
      ],
      onChange: (val) => {
        setParam('status', val);
        setParam('page', 1);
      },
    },
  ];

  const handleToggleInactive = () => {
    setParam('inactiveDays', inactiveDays === '30' ? '' : '30');
    setParam('page', 1);
  };

  // Bulk actions
  const handleBulkStatusConfirm = async (reason?: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await adminApi.bulkUpdateStatus({
        ids: selectedIds,
        status: bulkDialog.targetStatus,
        reason: reason || '',
      });
      alert(
        `Bulk operation complete. Updated: ${res.updatedCount}, Skipped: ${res.skippedCount}.`
      );
      setBulkDialog({ isOpen: false, targetStatus: 'suspended' });
      setSelectedIds([]);
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update users in bulk.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportSelected = () => {
    const selectedUsers = users.filter((u) => selectedIds.includes(u.id));
    if (selectedUsers.length === 0) return;
    downloadCsv(
      'selected_users_export.csv',
      selectedUsers.map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || '',
      })),
      ['id', 'name', 'email', 'role', 'status', 'emailVerified', 'createdAt', 'lastLoginAt']
    );
  };

  const handleExportFullCsv = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role && role !== 'all') params.set('role', role);
    if (status && status !== 'all') params.set('status', status);
    if (inactiveDays) params.set('inactiveDays', inactiveDays);
    const downloadUrl = `/api/admin/users/export.csv?${params.toString()}`;
    window.location.href = downloadUrl;
  };

  // Row formatting
  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const columns: Column<AdminUserItem>[] = [
    {
      key: 'name',
      header: 'Person',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#374151] font-medium text-[12px] flex items-center justify-center shrink-0 border border-[#E5E7EB]">
            {u.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="truncate">
            <span className="font-medium text-[#111827] block truncate">{u.fullName}</span>
            <span className="text-[12px] text-[#6B7280] block truncate">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '130px',
      render: (u) => (
        <span className="capitalize text-[12px] font-medium text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] px-2 py-0.5 rounded-[4px]">
          {u.role.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (u) => (
        <StatusDot
          status={u.status === 'active' ? 'success' : 'danger'}
          label={u.status === 'active' ? 'Active' : 'Suspended'}
        />
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Seen',
      sortable: true,
      width: '130px',
      render: (u) => (
        <span className="text-[12px] text-[#4B5563]">{formatRelativeTime(u.lastLoginAt)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      width: '120px',
      render: (u) => (
        <span className="text-[12px] text-[#6B7280]">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const pageActions = (
    <>
      <button
        type="button"
        onClick={handleExportFullCsv}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[6px] transition-colors focus:outline-hidden"
      >
        <Download size={14} />
        <span>Export CSV</span>
      </button>

      <button
        type="button"
        onClick={() => setInviteModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[6px] transition-colors focus:outline-hidden shadow-xs"
      >
        <UserPlus size={14} />
        <span>Invite Staff</span>
      </button>
    </>
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Users"
        subtitle="Search, inspect, and manage accounts across all platform roles."
        actions={pageActions}
      />

      {/* FilterBar with quick inactive toggle */}
      <div className="space-y-3">
        <FilterBar
          searchQuery={q}
          onSearchChange={(query) => {
            setParam('q', query);
            setParam('page', 1);
          }}
          searchPlaceholder="Search by name or email..."
          filters={filterConfigs}
          onReset={() => {
            resetParams();
          }}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleInactive}
            className={`px-2.5 py-1 text-[12px] font-medium rounded-[4px] border transition-colors ${
              inactiveDays === '30'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111827]'
            }`}
          >
            Not seen in 30+ days
          </button>
        </div>
      </div>

      {/* Sticky Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 bg-[#111827] text-white rounded-[8px] px-5 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium">
              {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setBulkDialog({ isOpen: true, targetStatus: 'suspended' })}
              className="px-3 py-1 text-[12px] font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-[4px] transition-colors"
            >
              Suspend Selected
            </button>
            <button
              type="button"
              onClick={() => setBulkDialog({ isOpen: true, targetStatus: 'active' })}
              className="px-3 py-1 text-[12px] font-medium bg-[#16A34A] hover:bg-[#15803D] text-white rounded-[4px] transition-colors"
            >
              Activate Selected
            </button>
            <button
              type="button"
              onClick={handleExportSelected}
              className="px-3 py-1 text-[12px] font-medium bg-[#374151] hover:bg-[#4B5563] text-white rounded-[4px] transition-colors"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              aria-label="Clear selection"
              className="p-1 text-[#9CA3AF] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Users DataTable */}
      <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
        <DataTable<AdminUserItem>
          columns={columns}
          data={users}
          keyField="id"
          loading={loading}
          error={error}
          onRetry={fetchUsers}
          emptyMessage="No users found matching the selected criteria."
          onRowClick={(user) => {
            setSelectedUserId(user.id);
            setDrawerOpen(true);
          }}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          sortColumn={sort}
          sortDirection={order}
          onSort={handleSort}
          page={page}
          pageSize={20}
          total={total}
          onPageChange={(nextPage) => setParam('page', nextPage)}
        />
      </div>

      {/* User Detail Drawer */}
      <UserDrawer
        userId={selectedUserId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUserId(null);
        }}
        currentUser={currentUser}
        onUserMutated={fetchUsers}
      />

      {/* Staff Invitation Modal */}
      <InviteStaffModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          fetchUsers();
        }}
      />

      {/* Bulk Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDialog.isOpen}
        onClose={() => setBulkDialog({ isOpen: false, targetStatus: 'suspended' })}
        onConfirm={handleBulkStatusConfirm}
        title={
          bulkDialog.targetStatus === 'suspended'
            ? 'Suspend Selected Users'
            : 'Activate Selected Users'
        }
        message={`Are you sure you want to ${bulkDialog.targetStatus} ${selectedIds.length} selected user accounts?`}
        confirmLabel={bulkDialog.targetStatus === 'suspended' ? 'Suspend Users' : 'Activate Users'}
        isDestructive={bulkDialog.targetStatus === 'suspended'}
        reasonRequired={bulkDialog.targetStatus === 'suspended'}
        reasonPlaceholder="Mandatory reason for bulk account suspension..."
        isLoading={bulkLoading}
      />
    </div>
  );
};

export default AdminUsersPage;
