import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Plus,
  X,
  FileCheck2,
  Sparkles,
  Award,
  ShieldCheck,
  ChevronLeft,
  Target
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DomainRoleSelector } from '../common/DomainRoleSelector';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { StorageService } from '../../services/storageService';

interface FirstRunOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirstRunOnboardingModal: React.FC<FirstRunOnboardingModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    addSelfReportedSkill
  } = useStudent();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Profile fields (Step 2)
  const [institution, setInstitution] = useState(user?.institution || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear ? String(user?.graduationYear) : '');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [addedSkills, setAddedSkills] = useState<string[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleFinishOnboarding = () => {
    if (user) {
      StorageService.setUserWelcomeModalSeen(user.id, true);
    }
    onClose();
  };

  const handleStartAssessment = () => {
    handleFinishOnboarding();
    navigate('/student/assessment');
  };

  const handleSaveStep2 = async () => {
    setIsSavingProfile(true);
    try {
      if (institution || degree || graduationYear) {
        await updateProfile({
          institution: institution.trim(),
          degree: degree.trim(),
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined
        });
      }

      // Record any unverified self-reported skills
      addedSkills.forEach((skillName) => {
        addSelfReportedSkill(skillName, 'Technical Skills', 2);
      });
    } catch (err) {
      console.warn('Notice saving profile background:', err);
    } finally {
      setIsSavingProfile(false);
      setStep(3);
    }
  };

  const handleAddSkillTag = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !addedSkills.includes(trimmed)) {
      setAddedSkills((prev) => [...prev, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkillTag = (skillToRemove: string) => {
    setAddedSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFinishOnboarding}
      title={
        step === 1
          ? 'Welcome to SARATHI AI'
          : step === 2
          ? 'Academic & Skill Profile (Optional)'
          : 'Your Pathway is Ready'
      }
      subtitle={
        step === 1
          ? 'Step 1 of 3: Define your career destination'
          : step === 2
          ? 'Step 2 of 3: Provide optional context'
          : 'Step 3 of 3: Launch your diagnostic evaluation'
      }
      maxWidth="3xl"
      closeOnClickOutside={false}
    >
      <div className="space-y-6 py-2">
        {/* Progress indicator */}
        <div className="flex items-center justify-between border-b border-[#E0E7F2] pb-4">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step === s
                    ? 'bg-[#1E40AF] text-white ring-4 ring-blue-100'
                    : step > s
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {step === 1 && 'Career Target'}
            {step === 2 && 'Optional Context'}
            {step === 3 && 'Diagnostic'}
          </span>
        </div>

        {/* STEP 1: Welcome & Career Target Selection */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 rounded-xl border border-blue-100/80">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[#1E40AF] text-white rounded-lg mt-0.5 shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B1B43] text-sm sm:text-base">
                    Evidence-Driven Skill Passport & Career Copilot
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    SARATHI AI verifies real student capabilities through diagnostic assessments,
                    audited project repositories, and canonical role benchmarks. Select your goal to calibrate your journey.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Your Target Role & Domain
              </label>
              <DomainRoleSelector
                selectedDomainId={targetDomain}
                selectedRoleTitle={targetRole}
                onSelectRole={(role, domain) => {
                  setTargetRole(role, domain);
                  setTargetDomain(domain);
                }}
                variant="inline"
                showOverview={false}
              />
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <span className="text-xs text-slate-400">
                You can change your target role at any time from the dashboard.
              </span>
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                disabled={!targetRole}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Optional Academic Background & Self-Reported Skills */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>
                <strong>Truthful Skill Engine:</strong> Self-reported skills are treated as unverified claims and will not earn verified status on your Skill Passport until confirmed through assessments or code evidence.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College or Institution (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. National Institute of Technology"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Major (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Computer Science"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Graduation Year (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2026"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Self-reported skills */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Self-Reported Skills (Optional Unverified Claims)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. TypeScript, Docker, PostgreSQL"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkillTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button variant="secondary" size="sm" onClick={handleAddSkillTag} icon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>

              {addedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {addedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillTag(sk)}
                        className="ml-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep(3)}
                >
                  Skip for Now
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveStep2}
                  disabled={isSavingProfile}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Recommended Action — Diagnostic Assessment */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center py-4 px-2">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-[#1E40AF] mb-3 border border-blue-100">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#0B1B43]">
                Your Role Profile: {targetRole || 'Full-Stack Developer'}
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1">
                Your canonical benchmark is loaded. Complete your first diagnostic assessment to calibrate your skill gap analysis and unlock your verifiable Skill Passport.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-xs text-slate-800 flex items-center mb-1">
                  <FileCheck2 className="w-4 h-4 text-blue-600 mr-1.5" />
                  1. Adaptive Test
                </div>
                <p className="text-xs text-slate-500">
                  Multiple choice & scenario questions dynamically calibrated to {targetRole}.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-xs text-slate-800 flex items-center mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600 mr-1.5" />
                  2. Gap Matrix
                </div>
                <p className="text-xs text-slate-500">
                  Identifies foundational vs high-priority deficits against industry benchmarks.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-xs text-slate-800 flex items-center mb-1">
                  <Award className="w-4 h-4 text-emerald-600 mr-1.5" />
                  3. Verified Ledger
                </div>
                <p className="text-xs text-slate-500">
                  Scores and evidence records are stamped directly to your portable Skill Passport.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={handleFinishOnboarding}
                className="w-full sm:w-auto"
              >
                Explore Dashboard First
              </Button>
              <Button
                variant="primary"
                onClick={handleStartAssessment}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-md"
              >
                Launch Diagnostic Assessment
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
