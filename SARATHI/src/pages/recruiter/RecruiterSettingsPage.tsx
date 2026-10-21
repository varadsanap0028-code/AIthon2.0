import React, { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useRecruiter } from '../../context/RecruiterContext';

export const RecruiterSettingsPage: React.FC = () => {
  const { showToast } = useRecruiter();
  const [requireAssessments, setRequireAssessments] = useState(true);
  const [passingThreshold, setPassingThreshold] = useState(75);
  
  const [hidePrivateContact, setHidePrivateContact] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Hiring platform settings updated successfully', 'success');
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Hiring Platform & Security Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure evidence verification policies, assessment thresholds, and candidate privacy protection.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Skill Verification & Assessment Policies</span>
            </h3>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Enforce Practical Assessment for Senior Roles</span>
                <span className="text-[11px] text-slate-500">Require candidates applying to Senior/Lead roles to pass a domain benchmark</span>
              </div>
              <input
                type="checkbox"
                checked={requireAssessments}
                onChange={(e) => setRequireAssessments(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Default Assessment Passing Score Benchmark</span>
                <span className="font-black text-indigo-600">{passingThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="90"
                step="5"
                value={passingThreshold}
                onChange={(e) => setPassingThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Candidate Privacy & Consent Safeguards</span>
            </h3>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Hide Unverified Private Contact Information</span>
                <span className="text-[11px] text-slate-500">Require candidate consent before revealing personal phone numbers or direct addresses</span>
              </div>
              <input
                type="checkbox"
                checked={hidePrivateContact}
                onChange={(e) => setHidePrivateContact(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {saving ? 'Updating...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
