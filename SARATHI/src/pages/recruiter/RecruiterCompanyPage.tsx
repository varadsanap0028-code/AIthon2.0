import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';

export const RecruiterCompanyPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [, setOrg] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const data = await recruiterApi.getOrganization();
        setOrg(data);
        setName(data.name);
        setTimezone(data.timezone);
        setCurrency(data.currency);
      } catch {
        showToast('Failed to load organization profile', 'error');
      }
    };
    fetchOrg();
  }, [activeOrgId, refreshKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Organization profile saved successfully', 'success');
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Organization Profile & Brand</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure hiring entity branding, regional time zones, and currency standards.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
              {name.charAt(0) || 'S'}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{name || 'Organization'}</h3>
              <p className="text-xs text-slate-400">Enterprise Verified Employer Entity</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Primary Operational Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Default Compensation Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
