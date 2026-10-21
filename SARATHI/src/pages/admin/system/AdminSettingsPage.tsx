/**
 * SARATHI Admin Portal — Platform Settings & Feature Switches Page
 * PRD Phase 10
 * Dynamic switches, maintenance mode gate with typed confirmation, and live audits.
 */

import React, { useState } from 'react';
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';
import { adminApi, useAdminQuery } from '../../../services/adminApi';

export const AdminSettingsPage: React.FC = () => {
  const [togglePendingKey, setTogglePendingKey] = useState<string | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [maintenanceReason, setMaintenanceReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: flagData, loading: flagsLoading, refetch: refetchFlags } = useAdminQuery<{ flags: any[] }>(
    () => adminApi.getFeatureFlags(),
    []
  );

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    // If toggling maintenance mode ON, require modal confirmation
    if (key === 'maintenance_mode' && !currentEnabled) {
      setConfirmInput('');
      setMaintenanceReason('Scheduled maintenance window');
      setShowMaintenanceModal(true);
      return;
    }

    try {
      setTogglePendingKey(key);
      const res = await adminApi.setFeatureFlag(
        key,
        !currentEnabled,
        `Toggled ${key} to ${!currentEnabled}`
      );
      setToastMessage(`Switch "${key}" updated to ${res.enabled ? 'ENABLED' : 'DISABLED'}`);
      await refetchFlags();
    } catch {
      alert('Failed to update switch.');
    } finally {
      setTogglePendingKey(null);
    }
  };

  const handleConfirmMaintenance = async () => {
    if (confirmInput.trim() !== 'MAINTENANCE') return;
    try {
      setIsSubmitting(true);
      await adminApi.setFeatureFlag('maintenance_mode', true, maintenanceReason);
      setShowMaintenanceModal(false);
      setToastMessage('Platform is now in MAINTENANCE MODE. Non-admin traffic suspended.');
      await refetchFlags();
    } catch {
      alert('Failed to enable maintenance mode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMaintenanceActive = Boolean(
    flagData?.flags?.find((f) => f.key === 'maintenance_mode')?.enabled
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Platform Settings & Feature Switches</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 10 • Switches
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Toggle platform functionality in real-time without server restarts. Every mutation is immutably logged to the audit chain.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Maintenance Mode Alert Banner if Active */}
      {isMaintenanceActive && (
        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl flex items-center justify-between text-red-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">MAINTENANCE MODE IS CURRENTLY ACTIVE</span>
              <span className="text-xs text-red-700">
                All candidate, recruiter, and institutional portal traffic is blocked with 503 SERVICE UNAVAILABLE. Admin access remains open.
              </span>
            </div>
          </div>
          <button
            onClick={() => handleToggle('maintenance_mode', true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm"
          >
            Disable Maintenance Mode
          </button>
        </div>
      )}

      {/* Feature Flags Switch List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" /> Platform Switches ({flagData?.flags?.length || 0})
          </span>
        </div>

        {flagsLoading ? (
          <div className="text-center py-12 text-xs text-gray-400">Loading switches...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {flagData?.flags?.map((flag) => {
              const isEnabled = Boolean(flag.enabled);
              const isPending = togglePendingKey === flag.key;
              const isMaintenance = flag.key === 'maintenance_mode';

              return (
                <div
                  key={flag.key}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    isMaintenance && isEnabled ? 'bg-red-50/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs font-mono text-gray-900">{flag.key}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isEnabled
                            ? isMaintenance
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{flag.description}</p>
                    <span className="text-[11px] text-gray-400 block">
                      Last modified: {flag.updated_at ? flag.updated_at.slice(0, 19).replace('T', ' ') : 'Default'}
                      {flag.updated_by_name && ` by ${flag.updated_by_name}`}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(flag.key, isEnabled)}
                    disabled={isPending}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isEnabled
                        ? isMaintenance
                          ? 'bg-red-600'
                          : 'bg-indigo-600'
                        : 'bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Maintenance Confirmation */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Enable Maintenance Mode?</h3>
                <span className="text-xs text-red-600 font-semibold">Immediate platform suspension</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Enabling maintenance mode will return <strong>503 Service Unavailable</strong> to all candidates, recruiters, and colleges. Platform Admin portal remains active.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">Audit Reason</label>
              <input
                type="text"
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="Reason for maintenance..."
                className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">
                Type <span className="font-mono text-red-600 font-bold">MAINTENANCE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="MAINTENANCE"
                className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput.trim() !== 'MAINTENANCE' || isSubmitting}
                onClick={handleConfirmMaintenance}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-40"
              >
                {isSubmitting ? 'Enabling...' : 'Confirm Maintenance Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
