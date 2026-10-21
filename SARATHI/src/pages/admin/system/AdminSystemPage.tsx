/**
 * SARATHI Admin Portal — System Operations & Probes Page
 * PRD Phase 10
 * Status cards, request telemetry, server error logs, SQLite backups, and data retention.
 */

import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Cpu,
  Bot,
  ShieldAlert,
  RefreshCw,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { adminApi, useAdminQuery } from '../../../services/adminApi';

export const AdminSystemPage: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  // Retention tool state
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  // Queries
  const { data: health, loading: healthLoading, refetch: refetchHealth } = useAdminQuery<any>(
    () => adminApi.getSystemHealth(),
    []
  );

  const { data: metrics, refetch: refetchMetrics } = useAdminQuery<any>(
    () => adminApi.getSystemMetrics(),
    []
  );

  const { data: errorLogs, refetch: refetchErrors } = useAdminQuery<any>(
    () => adminApi.getSystemErrors(),
    []
  );

  const { data: backupData, refetch: refetchBackups } = useAdminQuery<any>(
    () => adminApi.getSystemBackups(),
    []
  );

  // 15s auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchHealth();
      refetchMetrics();
      refetchErrors();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetchHealth, refetchMetrics, refetchErrors]);

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setBackupSuccess(null);
      const res = await adminApi.createSystemBackup();
      setBackupSuccess(`Backup created: ${res.filename} (${res.sizeMb} MB)`);
      refetchBackups();
    } catch {
      alert('Failed to create backup.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDryRunRetention = async () => {
    try {
      setIsPurging(true);
      setPurgeSuccess(null);
      const res = await adminApi.runSystemRetention(true, retentionDays);
      setDryRunResult(res);
    } catch {
      alert('Retention dry run failed.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleExecuteRetention = async () => {
    if (!window.confirm(`Permanently purge ${dryRunResult?.affected?.integrityEvents + dryRunResult?.affected?.integrityRiskScores} records?`)) return;
    try {
      setIsPurging(true);
      const res = await adminApi.runSystemRetention(false, retentionDays);
      setPurgeSuccess(res.message);
      setDryRunResult(null);
      refetchHealth();
    } catch {
      alert('Retention purge failed.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">System Operations & Health</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Phase 10 • Operations
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time infrastructure probes, request telemetry, backups, and data retention policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Auto-refresh (15s)
          </label>
          <button
            onClick={() => {
              refetchHealth();
              refetchMetrics();
              refetchErrors();
              refetchBackups();
            }}
            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            title="Refresh Now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Probes Status Cards */}
      {healthLoading ? (
        <div className="text-center py-6 text-xs text-gray-400">Querying system probes...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Server Process */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-600" /> Server Node
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              <span className="text-lg font-black text-gray-900">
                {Math.round((health?.process?.uptimeSeconds || 0) / 60)}m uptime
              </span>
              <span className="text-[11px] text-gray-400 block">
                Node {health?.process?.nodeVersion} • Heap: {health?.process?.heapUsedMb}MB
              </span>
            </div>
          </div>

          {/* Database */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" /> Database WAL
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              <span className="text-lg font-black text-gray-900">
                {health?.database?.fileSizeMb || 0} MB
              </span>
              <span className="text-[11px] text-gray-400 block">
                WAL: {health?.database?.walSizeMb || 0}MB • Schema v{health?.database?.schemaVersion}
              </span>
            </div>
          </div>

          {/* Code Runner */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-600" /> Code Runner
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.codeRunner?.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-black text-gray-900 uppercase">
                {health?.codeRunner?.status || 'Active'}
              </span>
              <span className="text-[11px] text-gray-400 block truncate">
                Driver: {health?.codeRunner?.driver || 'Local Engine'}
              </span>
            </div>
          </div>

          {/* AI Readiness */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-purple-600" /> AI Engine
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.ai?.configured ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-black text-gray-900 capitalize">
                {health?.ai?.status?.replace('_', ' ') || 'Ready'}
              </span>
              <span className="text-[11px] text-gray-400 block">
                {health?.ai?.configured ? 'Gemini 1.5' : 'Deterministic fallback'}
              </span>
            </div>
          </div>

          {/* Rate Limiter */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Rate Limiter
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              <span className="text-sm font-black text-gray-900">Protected</span>
              <span className="text-[11px] text-gray-400 block">
                Max {health?.rateLimiter?.adminLimit || 120} req/min
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Charts (15-min Rolling Window) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-900">Request Throughput (Last 15 Minutes)</h2>
              <span className="text-[11px] text-gray-400">Total: {metrics?.totalRequestsLast15m || 0} calls</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#4F46E5" strokeWidth={2} dot={false} name="Requests" />
                <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} dot={false} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-900">Latency Profile (p50 / p95 ms)</h2>
              <span className="text-[11px] text-gray-400">Measured at response completion</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="p50 (ms)" />
                <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={2} dot={false} name="p95 (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Backups & Retention Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Backups Management (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold text-gray-900">Database Snapshots & Backups</h3>
                <span className="text-[11px] text-gray-400">WAL-checkpointed on-disk backup archives</span>
              </div>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isCreatingBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              Create Backup
            </button>
          </div>

          {backupSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupSuccess}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="py-2 px-3">Filename</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backupData?.backups?.map((b: any) => (
                  <tr key={b.filename} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono font-medium text-gray-900">{b.filename}</td>
                    <td className="py-2 px-3 text-gray-600">{b.sizeMb} MB</td>
                    <td className="py-2 px-3 text-right text-gray-400">{b.createdAt.slice(0, 19).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Retention Tool (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-xs font-bold text-gray-900">Data Retention & Purging</h3>
              <span className="text-[11px] text-gray-400">Purge stale proctoring telemetry</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">Retention Window:</span>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value={30}>Older than 30 Days</option>
                <option value={60}>Older than 60 Days</option>
                <option value={90}>Older than 90 Days</option>
                <option value={180}>Older than 180 Days</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
              <span className="text-xs font-semibold text-gray-800 block">Dry Run Verification</span>
              <p className="text-[11px] text-gray-500">
                Always evaluate impacted record count before permanently deleting proctoring telemetry.
              </p>
              <button
                onClick={handleDryRunRetention}
                disabled={isPurging}
                className="w-full py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Run Dry-Run Count
              </button>
            </div>

            {dryRunResult && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                <div className="font-bold text-amber-900">{dryRunResult.message}</div>
                <div className="text-[11px] text-amber-800">
                  Integrity Events: {dryRunResult.affected.integrityEvents} • Risk Scores: {dryRunResult.affected.integrityRiskScores}
                </div>
                <button
                  onClick={handleExecuteRetention}
                  disabled={isPurging}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Confirm Permanent Deletion
                </button>
              </div>
            )}

            {purgeSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{purgeSuccess}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Server Error Ring Buffer */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-gray-900">
              Recent Server Error Log (Last 100 Ring Buffer)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400">Captured at middleware layer</span>
        </div>

        {errorLogs?.errors?.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No server errors (5xx) recorded in the in-memory ring buffer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Route</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {errorLogs?.errors?.map((err: any) => (
                  <tr key={err.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{err.timestamp.slice(11, 19)}</td>
                    <td className="py-2 px-3 font-bold text-gray-700 uppercase">{err.method}</td>
                    <td className="py-2 px-3 font-mono text-gray-900">{err.route}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                        {err.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-red-600 truncate max-w-xs">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemPage;
