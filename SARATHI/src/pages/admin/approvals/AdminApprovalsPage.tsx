import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/admin/PageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { FilterBar } from '../../../components/admin/FilterBar';
import { Tabs } from '../../../components/admin/Tabs';
import { DataTable } from '../../../components/admin/DataTable';
import type { Column } from '../../../components/admin/DataTable';
import { StatusDot } from '../../../components/admin/StatusDot';
import type { StatusType } from '../../../components/admin/StatusDot';
import { useUrlState } from '../../../components/admin/useUrlState';
import { adminApi } from '../../../services/adminApi';
import type {
  AdminApprovalItem,
  AdminApprovalStats,
  AdminApprovalListResponse,
} from '../../../services/adminApi';
import { ApprovalDrawer } from './ApprovalDrawer';

export const AdminApprovalsPage: React.FC = () => {
  // URL state synchronization
  const { getParam, setParam, resetParams } = useUrlState({
    status: 'pending',
    q: '',
    docType: '',
    olderThan: '',
    sort: 'oldest',
    page: '1',
  });

  const statusTab = getParam('status');
  const searchQuery = getParam('q');
  const docTypeFilter = getParam('docType');
  const olderThanFilter = getParam('olderThan');
  const sortOption = getParam('sort');
  const currentPage = Math.max(1, parseInt(getParam('page') || '1', 10) || 1);

  // Data states
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminApprovalListResponse | null>(null);
  const [stats, setStats] = useState<AdminApprovalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Selected row and drawer state
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  // Load aggregated stats
  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    adminApi
      .getApprovalStats()
      .then((res) => {
        if (!active) return;
        setStats(res);
        setStatsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Load approvals listing
  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getApprovals({
        status: statusTab,
        q: searchQuery,
        documentType: docTypeFilter,
        olderThanHours: olderThanFilter,
        sort: sortOption,
        page: currentPage,
        pageSize: 15,
      });
      setData(res);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [statusTab, searchQuery, docTypeFilter, olderThanFilter, sortOption, currentPage]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals, refreshKey]);

  // Keyboard navigation: J (next), K (previous), Enter (open drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea, or if drawer is open
      if (
        isDrawerOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (!data?.items || data.items.length === 0) return;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(data.items.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        if (focusedRowIndex >= 0 && focusedRowIndex < data.items.length) {
          e.preventDefault();
          setSelectedVerificationId(data.items[focusedRowIndex].id);
          setIsDrawerOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, data?.items, focusedRowIndex]);

  const handleOpenDrawer = (item: AdminApprovalItem, index?: number) => {
    if (typeof index === 'number') {
      setFocusedRowIndex(index);
    }
    setSelectedVerificationId(item.id);
    setIsDrawerOpen(true);
  };

  const handleDecisionSubmitted = () => {
    setRefreshKey((k) => k + 1);
  };

  // Tabs definitions with live counts
  const tabs = useMemo(() => {
    const counts = data?.statusCounts;
    return [
      {
        id: 'pending',
        label: counts ? `Waiting (${counts.pending})` : 'Waiting',
      },
      {
        id: 'needs_info',
        label: counts ? `Needs info (${counts.needs_info})` : 'Needs info',
      },
      {
        id: 'approved',
        label: counts ? `Approved (${counts.approved})` : 'Approved',
      },
      {
        id: 'rejected',
        label: counts ? `Rejected (${counts.rejected})` : 'Rejected',
      },
      {
        id: 'all',
        label: counts ? `All (${counts.all})` : 'All',
      },
    ];
  }, [data?.statusCounts]);

  // Table Columns definition
  const columns: Column<AdminApprovalItem>[] = useMemo(
    () => [
      {
        key: 'company',
        header: 'Company',
        render: (row, index) => {
          const isFocused = index === focusedRowIndex;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-[11px] shrink-0 ${
                  isFocused ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                {row.company.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-[#111827] block truncate max-w-[200px]">
                  {row.company}
                </span>
                <span className="text-[11px] text-[#6B7280] block truncate">
                  {row.taxIdentifier || row.companySlug}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'recruiter',
        header: 'Recruiter',
        render: (row) => (
          <div className="min-w-0">
            <span className="font-medium text-[#111827] block truncate max-w-[180px]">
              {row.recruiterName}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
              <span className="truncate max-w-[160px]" title={row.recruiterEmail}>
                {row.recruiterEmail}
              </span>
              {row.emailVerified && (
                <span className="text-emerald-600 font-bold" title="Email verified">
                  ✓
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'document',
        header: 'Document',
        render: (row) => {
          const sizeKb = Math.round(row.fileSize / 1024);
          return (
            <div className="min-w-0 space-y-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200 inline-block">
                {row.documentType}
              </span>
              <span className="text-[11px] text-[#6B7280] block truncate max-w-[170px]" title={row.documentName}>
                {row.documentName} {sizeKb > 0 ? `(${sizeKb} KB)` : ''}
              </span>
            </div>
          );
        },
      },
      {
        key: 'waiting',
        header: 'Waiting Time / SLA',
        render: (row) => {
          const slaColors = {
            ok: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            warning: 'text-amber-600 bg-amber-50 border-amber-200',
            breached: 'text-rose-600 bg-rose-50 border-rose-200',
          }[row.sla];

          const dotColor = {
            ok: 'bg-[#16A34A]',
            warning: 'bg-[#D97706]',
            breached: 'bg-[#DC2626]',
          }[row.sla];

          return (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <div className="text-[12px]">
                <span className="font-medium text-[#111827]">{row.waitingHours}h</span>
                <span className="text-[11px] text-[#6B7280] block">
                  {new Date(row.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${slaColors}`}>
                {row.sla}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const statusTypeMap: Record<string, StatusType> = {
            pending: 'warning',
            approved: 'success',
            rejected: 'danger',
            needs_info: 'neutral',
          };
          return (
            <StatusDot
              status={statusTypeMap[row.status] || 'neutral'}
              label={row.status.replace('_', ' ')}
            />
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row, index) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDrawer(row, index);
            }}
            className="px-2.5 py-1 text-[12px] font-medium rounded border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors"
          >
            Review
          </button>
        ),
      },
    ],
    [focusedRowIndex]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Recruiter Approvals"
        subtitle="Review company registration documents and verify employer identities."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#6B7280] bg-white border border-[#E5E7EB] px-2 py-1 rounded">
              <span>Keys:</span>
              <kbd className="px-1 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">J</kbd>
              <kbd className="px-1 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">K</kbd>
              <span>navigate,</span>
              <kbd className="px-1 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">Enter</kbd>
              <span>open</span>
            </span>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] rounded-[6px] transition-colors"
              title="Refresh queue"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        }
      />

      {/* Top Aggregated Metric Strip (4 StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Waiting Queue"
          value={statsLoading ? '...' : String(stats?.pendingCount ?? 0)}
          calculationInfo="Number of company verification submissions currently awaiting administrative decision."
        />
        <StatCard
          label="Avg Turnaround (30d)"
          value={statsLoading ? '...' : `${stats?.avgTurnaroundHours30d ?? 0}h`}
          calculationInfo="Average elapsed hours between recruiter submission and admin decision across the last 30 days."
        />
        <StatCard
          label="Approval Rate (30d)"
          value={statsLoading ? '...' : `${stats?.approvalRate30d ?? 100}%`}
          calculationInfo="Percentage of evaluated applications granted verification approval over the past 30 days."
        />
        <StatCard
          label="SLA Breaches"
          value={statsLoading ? '...' : String(stats?.breaches ?? 0)}
          calculationInfo="Verification requests currently waiting longer than the 48-hour service level target."
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {/* Tabs Bar */}
        <div className="px-4 pt-3 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <Tabs
            tabs={tabs}
            activeTab={statusTab}
            onChange={(tabId) => {
              setParam('status', tabId);
              setParam('page', '1');
              setFocusedRowIndex(-1);
            }}
          />
        </div>

        {/* FilterBar */}
        <div className="p-4 border-b border-[#E5E7EB]">
          <FilterBar
            searchPlaceholder="Search company, recruiter, tax ID..."
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setParam('q', val);
              setParam('page', '1');
            }}
            filters={[
              {
                id: 'docType',
                label: 'Document Type',
                value: docTypeFilter,
                options: [
                  { label: 'All Document Types', value: '' },
                  { label: 'GSTIN Registration', value: 'gstin' },
                  { label: 'PAN Card', value: 'pan' },
                  { label: 'Certificate of Incorporation', value: 'incorporation' },
                  { label: 'Utility Bill', value: 'utility_bill' },
                  { label: 'Other', value: 'other' },
                ],
                onChange: (v) => {
                  setParam('docType', v);
                  setParam('page', '1');
                },
              },
              {
                id: 'olderThan',
                label: 'SLA Age',
                value: olderThanFilter,
                options: [
                  { label: 'All Waiting Times', value: '' },
                  { label: '> 24 Hours Waiting', value: '24' },
                  { label: '> 48 Hours (Breached)', value: '48' },
                ],
                onChange: (v) => {
                  setParam('olderThan', v);
                  setParam('page', '1');
                },
              },
              {
                id: 'sort',
                label: 'Sort',
                value: sortOption,
                options: [
                  { label: 'Oldest First (SLA Priority)', value: 'oldest' },
                  { label: 'Newest First', value: 'newest' },
                ],
                onChange: (v) => setParam('sort', v),
              },
            ]}
            onReset={() => {
              resetParams();
            }}
          />
        </div>

        {/* Approvals Table */}
        <DataTable<AdminApprovalItem>
          columns={columns}
          data={data?.items || []}
          keyField="id"
          loading={loading}
          emptyMessage="No recruiter verification applications in this queue."
          onRowClick={(row) => {
            const index = (data?.items || []).indexOf(row);
            handleOpenDrawer(row, index >= 0 ? index : 0);
          }}
          page={currentPage}
          pageSize={data?.pageSize}
          total={data?.total}
          onPageChange={(newPage) => setParam('page', String(newPage))}
        />
      </div>

      {/* Review Drawer */}
      <ApprovalDrawer
        verificationId={selectedVerificationId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVerificationId(null);
        }}
        onDecisionSubmitted={handleDecisionSubmitted}
      />
    </div>
  );
};

export default AdminApprovalsPage;
