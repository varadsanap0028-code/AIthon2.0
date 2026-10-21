import React, { useState, useEffect } from 'react';
import { Settings, Bell, Database, CheckCircle2, AlertCircle, KeyRound, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  // Notification preferences
  const [emailDigest, setEmailDigest] = useState(true);
  const [roadmapReminders, setRoadmapReminders] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<{ success: boolean; data: { emailDigest: boolean; roadmapReminders: boolean; jobAlerts: boolean } }>(
        '/api/settings'
      )
      .then((res) => {
        if (!isMounted || !res?.data) return;
        setEmailDigest(Boolean(res.data.emailDigest));
        setRoadmapReminders(Boolean(res.data.roadmapReminders));
        setJobAlerts(Boolean(res.data.jobAlerts));
      })
      .catch((err) => {
        console.warn('Settings load fallback:', err?.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      await apiClient.put('/api/settings', {
        emailDigest,
        roadmapReminders,
        jobAlerts,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3500);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update preferences. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Settings Card */}
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E0E7F2] pb-4">
          <Settings className="w-6 h-6 text-[#087BFA]" />
          <div>
            <h2 className="text-xl font-extrabold text-[#0B1B43]">Account & Security Settings</h2>
            <p className="text-xs text-[#405B8B]">Manage security settings, notifications, and backend sync options.</p>
          </div>
        </div>

        {settingsSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-[#16A34A] text-xs font-bold border border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Preferences saved successfully to your account!</span>
          </div>
        )}

        {settingsError && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{settingsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Notification settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0B1B43] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#603DF5]" /> Notification Preferences
            </h3>

            {isLoadingSettings ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-12 bg-[#E0E7F2] rounded-xl" />
                <div className="h-12 bg-[#E0E7F2] rounded-xl" />
                <div className="h-12 bg-[#E0E7F2] rounded-xl" />
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer hover:border-[#087BFA] transition-colors">
                  <div className="pr-4">
                    <span className="font-semibold text-[#0B1B43] block">Email digests for learning progress</span>
                    <span className="text-[#405B8B]">Receive periodic milestone and progress summaries</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.checked)}
                    className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer hover:border-[#087BFA] transition-colors">
                  <div className="pr-4">
                    <span className="font-semibold text-[#0B1B43] block">Roadmap task reminders</span>
                    <span className="text-[#405B8B]">Keep on track with recommended next tasks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={roadmapReminders}
                    onChange={(e) => setRoadmapReminders(e.target.checked)}
                    className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer hover:border-[#087BFA] transition-colors">
                  <div className="pr-4">
                    <span className="font-semibold text-[#0B1B43] block">New skill-matched job & internship alerts</span>
                    <span className="text-[#405B8B]">Instant notifications when opportunities match your passport</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={jobAlerts}
                    onChange={(e) => setJobAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA] cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          <Button type="submit" variant="primary" disabled={isSavingSettings || isLoadingSettings}>
            {isSavingSettings ? 'Saving Preferences...' : 'Save Preferences'}
          </Button>
        </form>

        {/* Change Password Form */}
        <div className="pt-6 border-t border-[#E0E7F2] space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#603DF5]" />
            <div>
              <h3 className="text-sm font-bold text-[#0B1B43]">Password & Credentials</h3>
              <p className="text-xs text-[#405B8B]">Update your account password to keep your credentials secure.</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-[#16A34A] text-xs font-bold border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Password updated successfully! You can now use your new password.</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0B1B43] mb-1">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full pl-9 pr-10 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-[#405B8B] hover:text-[#0B1B43]"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1B43] mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-[#405B8B] hover:text-[#0B1B43]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B43] mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? 'Changing Password...' : 'Update Password'}
            </Button>
          </form>
        </div>

        {/* Database connection state */}
        <div className="space-y-3 pt-6 border-t border-[#E0E7F2]">
          <h3 className="text-sm font-bold text-[#0B1B43] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#087BFA]" /> Backend & Persistence Integration
          </h3>

          <div className="p-4 rounded-2xl bg-slate-50 border border-[#E0E7F2] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#0B1B43] block">SARATHI Database & API Engine</span>
              <span className="text-[#405B8B]">
                Connected to live SQLite persistence engine (Account: {user?.email || 'Authenticated'})
              </span>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
