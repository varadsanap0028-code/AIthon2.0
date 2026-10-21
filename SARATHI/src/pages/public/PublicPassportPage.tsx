import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  ExternalLink,
  MapPin,
  GraduationCap,
  Copy,
  Check,
  Award,
  Globe,
  Lock
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Logo } from '../../components/common/Logo';
import { apiClient } from '../../services/apiClient';

export const PublicPassportPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [passportData, setPassportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrivateOrNotFound, setIsPrivateOrNotFound] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!publicId) return;

    setIsLoading(true);
    setIsPrivateOrNotFound(false);

    apiClient
      .get<{ success: boolean; data: any }>(`/api/passport/public/${publicId}`)
      .then((res) => {
        if (res?.data) {
          setPassportData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Public passport load error:', err);
        setIsPrivateOrNotFound(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [publicId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-48 bg-slate-200 rounded-3xl" />
          <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isPrivateOrNotFound || !passportData) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#405B8B]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0B1B43]">Passport Unavailable</h2>
          <p className="text-xs text-[#405B8B] leading-relaxed">
            This Skill Passport is either marked private by the candidate or does not exist.
          </p>
          <div className="pt-2">
            <Link to="/">
              <Button variant="primary" size="sm">
                Explore Sarathi Platform
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { candidate, skills = [], evidence = [] } = passportData;

  return (
    <div className="min-h-screen bg-[#F4F7FC] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Branding & Action */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" showTagline={false} />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Link Copied!' : 'Share Passport'}
          </Button>
        </div>

        {/* Candidate Profile Header Card */}
        <Card className="p-8 space-y-6 border-t-4 border-t-[#087BFA]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white font-extrabold text-3xl shadow-lg">
                {candidate.full_name ? candidate.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-[#0B1B43]">{candidate.full_name}</h1>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title="Verified on Sarathi Enterprise Platform"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Candidate
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#087BFA] mt-0.5">
                  {candidate.headline || candidate.target_role || 'Aspiring Professional'}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#405B8B] mt-2 flex-wrap">
                  {candidate.institution && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{candidate.institution}</span>
                    </span>
                  )}
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{candidate.location}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-2">
              {candidate.github_url && (
                <a
                  href={candidate.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-[#E0E7F2] text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-50 transition-colors"
                  title="GitHub Profile"
                >
                  <GitBranch className="w-5 h-5" />
                </a>
              )}
              {candidate.portfolio_url && (
                <a
                  href={candidate.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-[#E0E7F2] text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-50 transition-colors"
                  title="Personal Portfolio"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {candidate.bio && (
            <p className="text-xs text-[#405B8B] leading-relaxed pt-2 border-t border-[#E0E7F2]">
              {candidate.bio}
            </p>
          )}
        </Card>

        {/* Skills Grid (Respecting Privacy Config) */}
        {passportData.sectionsConfig?.includeSkills !== false && skills.length > 0 && (
          <Card className="p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E0E7F2] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-[#0B1B43] text-lg">Competencies & Assessed Skills</h2>
                  <p className="text-xs text-[#405B8B]">
                    Transparent skill portfolio backed by diagnostic tests, repository submissions, and coursework
                  </p>
                </div>
              </div>
              <Badge variant="purple">{skills.length} Skills</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill: any) => {
                const status = skill.verification_status || 'self_reported';
                const isVerified = status === 'verified';
                const isEvaluated = status === 'diagnostic_tested' || status === 'assessment-completed';
                const isPending = status === 'pending_review';

                return (
                  <div
                    key={skill.skill_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isVerified
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isEvaluated
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white border-[#E0E7F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-[#0B1B43]">
                        {skill.skill_name}
                      </span>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : isEvaluated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Evaluated
                        </span>
                      ) : isPending ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          In Review
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Self-Reported
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#405B8B] mt-2">
                      <span>Proficiency Level</span>
                      <span className="font-bold text-[#0B1B43]">Level {skill.proficiency} / 5</span>
                    </div>
                    {skill.domain_title && (
                      <span className="text-[10px] font-semibold text-[#405B8B] mt-1 block">
                        {skill.domain_title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Project Evidence Card (Respecting Privacy Config) */}
        {passportData.sectionsConfig?.includeProjects !== false && evidence.length > 0 && (
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-[#E0E7F2] pb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#087BFA] flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-[#0B1B43] text-lg">Project Evidence & Repositories</h2>
                <p className="text-xs text-[#405B8B]">Submitted codebases demonstrating hands-on technical abilities</p>
              </div>
            </div>

            <div className="space-y-4">
              {evidence.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-white border border-[#E0E7F2] flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0B1B43]">{ev.title}</h4>
                      <Badge variant={ev.verification_status === 'verified' ? 'success' : 'gray'}>
                        {ev.verification_status === 'verified' ? 'Verified Code' : 'Pending Review'}
                      </Badge>
                    </div>
                    {ev.metadata?.description && (
                      <p className="text-xs text-[#405B8B]">{ev.metadata.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.reference_url && (
                      <a
                        href={ev.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0E7F2] text-xs font-bold text-[#087BFA] hover:bg-blue-50 transition-colors"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Repository</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {ev.metadata?.liveDemoUrl && (
                      <a
                        href={ev.metadata.liveDemoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0E7F2] text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Live Demo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer verification stamp */}
        <div className="py-6 text-center space-y-2 border-t border-[#E0E7F2]">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#405B8B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated and cryptographically verified on SARATHI</span>
          </div>
          <p className="text-[11px] text-[#405B8B]">
            Empowering students with verifiable merit-based talent profiles.
          </p>
        </div>
      </div>
    </div>
  );
};
