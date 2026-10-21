import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Users,
} from 'lucide-react';
import { adminApi, useAdminQuery } from '../../../services/adminApi';

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Info className="w-4 h-4 text-blue-600" /> },
  warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
  critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
  success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
};

export const AdminAnnouncementsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'all',
    severity: 'info',
    endsAt: '',
  });

  const { data, loading, refetch } = useAdminQuery(
    (signal) => adminApi.getAnnouncements(signal),
    []
  );

  const handleToggleActive = async (id: string, currentActive: number) => {
    try {
      await adminApi.toggleAnnouncement(id, currentActive !== 1);
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        severity: form.severity,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      });
      setIsModalOpen(false);
      setForm({ title: '', body: '', audience: 'all', severity: 'info', endsAt: '' });
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const previewConfig = SEVERITY_CONFIG[form.severity] || SEVERITY_CONFIG.info;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Platform Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Broadcast targeted maintenance notices, feature announcements, and banner alerts across student, recruiter, and college portals.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Announcement Banner</th>
              <th className="py-3 px-4">Audience</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Dismissals</th>
              <th className="py-3 px-4">Broadcast Schedule</th>
              <th className="py-3 px-4 text-right">Active Switch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Loading announcements...
                </td>
              </tr>
            ) : data?.announcements?.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  <Megaphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  No announcements broadcasted yet.
                </td>
              </tr>
            ) : (
              data?.announcements?.map((ann: any) => {
                const conf = SEVERITY_CONFIG[ann.severity] || SEVERITY_CONFIG.info;
                return (
                  <tr key={ann.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-gray-900">{ann.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ann.body}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        <Users className="w-3 h-3 text-gray-500" />
                        {ann.audience}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${conf.bg} ${conf.text}`}
                      >
                        {conf.icon}
                        <span className="capitalize">{ann.severity}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {ann.dismissal_count || 0} users dismissed
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(ann.starts_at).toLocaleDateString()}</span>
                      </div>
                      {ann.ends_at && (
                        <span className="text-[11px] text-gray-400">
                          Expires: {new Date(ann.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(ann.id, ann.active)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          ann.active === 1 ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            ann.active === 1 ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAnnouncement}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Broadcast Announcement</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Scheduled Infrastructure Upgrade"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body *</label>
                <textarea
                  required
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Detailed notice visible to users across target portals..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Audience</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Portals</option>
                    <option value="student">Students Only</option>
                    <option value="recruiter">Recruiters Only</option>
                    <option value="college">Colleges Only</option>
                    <option value="reviewer">Reviewers Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Severity Level</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="critical">Critical (Red)</option>
                    <option value="success">Success (Green)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expires On (Optional)</label>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Live Banner Preview */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Live Banner Preview
                </span>
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${previewConfig.bg} ${previewConfig.text}`}
                >
                  <div className="shrink-0 mt-0.5">{previewConfig.icon}</div>
                  <div className="text-xs">
                    <div className="font-bold">{form.title || 'Announcement Title'}</div>
                    <div className="mt-0.5">{form.body || 'Announcement message preview will display here.'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
              >
                Broadcast Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementsPage;
