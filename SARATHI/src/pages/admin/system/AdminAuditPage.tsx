/**
 * SARATHI Admin Portal — Audit Log & Tamper-Evident History
 * PRD Phase 10
 *
 * Implements:
 * - SHA-256 verification banner with head hash copy & chain validity check
 * - Search & multi-parameter filtering (action, entity type, text query)
 * - Expandable JSON before/after state diff highlighting mutated keys
 * - Paginated tabular ledger with CSV export
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Clock,
  User,
  Hash,
} from 'lucide-react';
import { adminApi } from '../../../services/adminApi';

interface AuditRecord {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: any | null;
  after: any | null;
  reason: string | null;
  ip: string | null;
  prevHash: string | null;
  hash: string | null;
  createdAt: string;
}

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('');

  // Expanded diff rows
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Chain verification state
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    ok: boolean;
    checked: number;
    headHash?: string;
    firstBrokenId?: string | null;
    reason?: string;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Fetch audit records
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        pageSize,
      };
      if (search.trim()) params.q = search.trim();
      if (entityType !== 'all') params.entityType = entityType;
      if (actionFilter.trim()) params.action = actionFilter.trim();

      const res = await adminApi.getAuditLogs(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, entityType, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Run integrity verification
  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await adminApi.verifyAuditChain();
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        ok: false,
        checked: 0,
        reason: err?.message || 'Network error verifying chain',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Run verification once on mount
  useEffect(() => {
    handleVerify();
  }, []);

  const handleCopyHeadHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportCsv = () => {
    const token = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sarathi_auth_token') || localStorage.getItem('sarathi_auth_token'))
      : null;
    
    // Download via link or fetch
    fetch('/api/admin/audit/export.csv', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sarathi_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => {
        alert(err.message || 'CSV export failed');
      });
  };

  // Helper to highlight changed keys between before and after
  const renderDiffViewer = (record: AuditRecord) => {
    const before = record.before;
    const after = record.after;

    if (!before && !after) {
      return (
        <div className="text-xs text-slate-400 italic py-2">
          No state snapshot captured for this event.
        </div>
      );
    }

    const allKeys = Array.from(
      new Set([
        ...(before && typeof before === 'object' ? Object.keys(before) : []),
        ...(after && typeof after === 'object' ? Object.keys(after) : []),
      ])
    );

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
        {/* Before */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            Previous State
          </div>
          {before ? (
            <pre className="text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
              {JSON.stringify(before, null, 2)}
            </pre>
          ) : (
            <span className="text-xs text-slate-500 italic">None (Newly Created)</span>
          )}
        </div>

        {/* After */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            New State (Mutated)
          </div>
          {after ? (
            <pre className="text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
              {JSON.stringify(after, null, 2)}
            </pre>
          ) : (
            <span className="text-xs text-slate-500 italic">None (Purged / Deleted)</span>
          )}
        </div>

        {/* Changed Keys Highlight */}
        {allKeys.length > 0 && (
          <div className="col-span-full bg-slate-950/70 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 mb-1.5">
              Modified Properties:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allKeys.map((k) => {
                const bVal = before ? before[k] : undefined;
                const aVal = after ? after[k] : undefined;
                const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
                return (
                  <span
                    key={k}
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      changed
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {k}: {changed ? 'MODIFIED' : 'UNCHANGED'}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log & Security Ledger</h1>
            <span className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full">
              SHA-256 Chained
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-evident, cryptographically chained record of all administrative mutations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              handleVerify();
              fetchLogs();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${verifying || loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Cryptographic Chain Integrity Verification Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            {verificationResult?.ok ? (
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {verificationResult?.ok
                    ? 'Cryptographic Chain Verified'
                    : 'Chain Integrity Warning'}
                </h3>
                {verificationResult && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {verificationResult.checked} records validated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {verificationResult?.ok
                  ? 'All sequential SHA-256 block hashes match perfectly with zero tampering detected.'
                  : verificationResult?.reason || 'Verifying chain integrity...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {verificationResult?.headHash && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400">Head:</span>
                <span className="max-w-[140px] truncate" title={verificationResult.headHash}>
                  {verificationResult.headHash}
                </span>
                <button
                  onClick={() => handleCopyHeadHash(verificationResult.headHash!)}
                  className="text-slate-400 hover:text-white transition ml-1"
                  title="Copy full Head Hash"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Re-verify Chain'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, reason, entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Entity:</span>
          </div>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Entities</option>
            <option value="user">User</option>
            <option value="flag">Feature Flag</option>
            <option value="system">System / Backup</option>
            <option value="approval">Recruiter Approval</option>
            <option value="ticket">Support Ticket</option>
            <option value="assessment_session">Integrity Review</option>
            <option value="skill">Skill</option>
            <option value="domain">Domain</option>
            <option value="benchmark">Benchmark</option>
            <option value="learning_resource">Learning Resource</option>
          </select>

          <input
            type="text"
            placeholder="Action prefix (e.g. flag.)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-2 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition w-36"
          />
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Reason / Note</th>
                <th className="py-3 px-4 text-right">Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((row) => {
                  const isExpanded = !!expandedRows[row.id];
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleRow(row.id)}
                        className={`hover:bg-slate-750 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-750/70' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(row.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium text-slate-200">{row.adminName}</span>
                          </div>
                          {row.adminEmail && (
                            <div className="text-[11px] text-slate-500 pl-5">{row.adminEmail}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block text-xs font-mono font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {row.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                          <span className="text-slate-400">{row.entityType}:</span>
                          <span className="ml-1 text-slate-200">{row.entityId || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate" title={row.reason || ''}>
                          {row.reason || <span className="text-slate-500 italic">—</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-xs text-slate-400">
                          <span title={row.hash || ''}>
                            {row.hash ? row.hash.substring(0, 10) + '...' : '—'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={7} className="p-4 border-b border-slate-700/60">
                            <div className="space-y-3">
                              {/* Meta information strip */}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pb-2 border-b border-slate-800 font-mono">
                                <div>
                                  <span className="text-slate-500">Record ID:</span>{' '}
                                  <span className="text-slate-300">{row.id}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Client IP:</span>{' '}
                                  <span className="text-slate-300">{row.ip || '127.0.0.1'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Previous Hash:</span>{' '}
                                  <span className="text-slate-300 truncate inline-block max-w-[120px] align-bottom" title={row.prevHash || ''}>
                                    {row.prevHash || 'GENESIS'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Row Hash:</span>{' '}
                                  <span className="text-slate-300 truncate inline-block max-w-[120px] align-bottom" title={row.hash || ''}>
                                    {row.hash || '—'}
                                  </span>
                                </div>
                              </div>

                              {/* State Diff Rendering */}
                              {renderDiffViewer(row)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-medium">{logs.length}</span> of{' '}
            <span className="text-white font-medium">{total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-750 disabled:opacity-40 text-slate-300 rounded border border-slate-700 transition"
            >
              Previous
            </button>
            <span className="px-2 font-mono">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-750 disabled:opacity-40 text-slate-300 rounded border border-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditPage;
