import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, AlertCircle, GitBranch, Link2, Globe, MapPin, Briefcase, FileText } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { techDomains } from '../../data/domainsCatalog';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading: authLoading } = useAuth();
  const { targetRole, setTargetRole } = useStudent();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [selectedRole, setSelectedRole] = useState(targetRole || user?.targetRole || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear ? String(user.graduationYear) : '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolioUrl || '');
  const [resumeUrl, setResumeUrl] = useState(user?.resumeUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setHeadline(user.headline || '');
      setInstitution(user.institution || '');
      setDegree(user.degree || '');
      setGraduationYear(user.graduationYear ? String(user.graduationYear) : '');
      setLocation(user.location || '');
      setBio(user.bio || '');
      setGithubUrl(user.githubUrl || '');
      setLinkedinUrl(user.linkedinUrl || '');
      setPortfolioUrl(user.portfolioUrl || '');
      setResumeUrl(user.resumeUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (targetRole) {
      setSelectedRole(targetRole);
    }
  }, [targetRole]);

  const isValidHttpUrl = (str: string) => {
    if (!str.trim()) return true;
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccess(false);

    // Client-side URL validation
    if (githubUrl && !isValidHttpUrl(githubUrl)) {
      setErrorMessage('GitHub profile must be a valid URL (starting with https:// or http://)');
      return;
    }
    if (linkedinUrl && !isValidHttpUrl(linkedinUrl)) {
      setErrorMessage('LinkedIn profile must be a valid URL (starting with https:// or http://)');
      return;
    }
    if (portfolioUrl && !isValidHttpUrl(portfolioUrl)) {
      setErrorMessage('Portfolio link must be a valid URL (starting with https:// or http://)');
      return;
    }
    if (resumeUrl && !isValidHttpUrl(resumeUrl)) {
      setErrorMessage('Resume link must be a valid URL (starting with https:// or http://)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedRole) {
        setTargetRole(selectedRole);
      }
      await updateProfile({
        fullName: fullName.trim(),
        headline: headline.trim() || undefined,
        targetRole: selectedRole || undefined,
        institution: institution.trim() || undefined,
        degree: degree.trim() || undefined,
        graduationYear: graduationYear.trim() ? graduationYear.trim() : undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 bg-[#E0E7F2] rounded-2xl" />
        <div className="h-96 bg-[#E0E7F2] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-[#E0E7F2] pb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {fullName ? fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43]">{fullName || 'Student'}</h2>
            <p className="text-xs text-[#405B8B]">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="purple">Student Account</Badge>
              {selectedRole && <Badge variant="blue">{selectedRole}</Badge>}
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-[#16A34A] text-xs font-bold border border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Profile information saved and synchronized successfully to your passport!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Anita Roy"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] focus:ring-1 focus:ring-[#087BFA] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Aspiring Full Stack Engineer"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] focus:ring-1 focus:ring-[#087BFA] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
              Target Career Role
            </label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] font-semibold bg-[#F4F7FC] focus:border-[#087BFA] outline-none cursor-pointer"
              >
                <option value="">-- Select Your Target Role --</option>
                {techDomains.map(domain => (
                  <optgroup key={domain.id} label={domain.title}>
                    {domain.roleTitles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">Institution / College</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. National Institute of Technology"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">Degree Program</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech Computer Science"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">Graduation Year</label>
              <input
                type="text"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2026"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India"
                  className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">Bio / Professional Summary</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief summary of your background, technical interests, and career goals..."
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
            />
          </div>

          {/* Extended Social & Portfolio Links */}
          <div className="pt-2 border-t border-[#E0E7F2] space-y-4">
            <h3 className="text-sm font-bold text-[#0B1B43] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#087BFA]" />
              Professional Links & Portfolio
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#405B8B] mb-1">GitHub Profile URL</label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/your-username"
                    className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#405B8B] mb-1">LinkedIn Profile URL</label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-[#087BFA] absolute left-3 top-3" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/your-username"
                    className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#405B8B] mb-1">Personal Website or Portfolio URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.dev"
                    className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#405B8B] mb-1">External Resume Document URL (PDF / Cloud Link)</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#603DF5] absolute left-3 top-3" />
                  <input
                    type="url"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/your-resume or https://my-resume.pdf"
                    className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving Profile...' : 'Save Profile Changes'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/student/resume')}
              leftIcon={<FileText className="w-4 h-4 text-[#603DF5]" />}
            >
              Preview Auto-Generated Resume
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
