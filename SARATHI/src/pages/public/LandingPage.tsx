import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  Map,
  Building2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Code
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 pb-20">
      {/* HERO SECTION */}
      <section className="relative pt-12 lg:pt-20 pb-16 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#087BFA]/15 to-[#603DF5]/15 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-[#087BFA] text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#603DF5]" />
            <span>AI-POWERED SKILL INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0B1B43] tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Turn Your Skills Into <span className="bg-gradient-to-r from-[#087BFA] via-[#603DF5] to-[#4C26E0] bg-clip-text text-transparent">Career Opportunities.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#405B8B] max-w-2xl mx-auto font-normal leading-relaxed">
            Discover your skill gaps, follow a personalized learning roadmap, showcase your abilities through verified projects, and find opportunities that match your potential.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/signup')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto px-8"
            >
              Start Your Journey
            </Button>

            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                Explore How It Works
              </Button>
            </a>
          </div>

          {/* DASHBOARD PREVIEW MOCKUP */}
          <div className="pt-12 relative max-w-5xl mx-auto">
            <div className="relative rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-[#E0E7F2] ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between pb-4 border-b border-[#E0E7F2] mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs font-semibold text-[#405B8B] ml-2">SARATHI Student Dashboard Preview</span>
                </div>
                <Badge variant="purple" icon={<Sparkles className="w-3 h-3" />}>Target Role: Full-Stack Developer</Badge>
              </div>

              {/* Preview Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Card 1: Readiness Score */}
                <div className="p-5 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-[#405B8B] uppercase">Career Readiness</span>
                    <Badge variant="success">84% Match</Badge>
                  </div>
                  <div className="text-3xl font-black text-[#0B1B43] mb-3">84 / 100</div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#087BFA] to-[#603DF5] h-full w-[84%]" />
                  </div>
                  <p className="text-[11px] text-[#405B8B] mt-2">12 of 15 core skills verified via assessment & capstone evidence.</p>
                </div>

                {/* Card 2: Skill Gap Highlight */}
                <div className="p-5 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-[#405B8B] uppercase">Top Skill Gap</span>
                    <Badge variant="warning">High Priority</Badge>
                  </div>
                  <div className="text-lg font-bold text-[#0B1B43]">TypeScript & Testing</div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#405B8B]">
                    <span>Current: Level 2</span>
                    <span>→</span>
                    <span className="font-semibold text-[#087BFA]">Target: Level 4</span>
                  </div>
                  <p className="text-[11px] text-[#405B8B] mt-3 font-medium text-purple-700 bg-purple-50 p-2 rounded-lg">
                    Recommended: Complete Stage 2 module.
                  </p>
                </div>

                {/* Card 3: Matched Opportunity */}
                <div className="p-5 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-[#405B8B] uppercase">Matched Opportunity</span>
                    <Badge variant="blue">92% Match</Badge>
                  </div>
                  <div className="text-sm font-bold text-[#0B1B43]">Junior Full-Stack Developer</div>
                  <p className="text-xs text-[#405B8B]">NexTech Innovations • ₹6.5 - ₹9.0 LPA</p>
                  <div className="mt-3 flex gap-1 flex-wrap">
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">React.js</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">Node.js</span>
                    <span className="text-[10px] bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded font-semibold">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: HOW IT WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        <div className="max-w-2xl mx-auto">
          <Badge variant="purple" className="mb-3">STEP-BY-STEP GUIDANCE</Badge>
          <h2 className="text-3xl font-extrabold text-[#0B1B43]">How SARATHI Powers Your Journey</h2>
          <p className="text-[#405B8B] text-sm mt-2">
            A continuous loop of assessment, skill analysis, structured learning, and job matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <Card hoverEffect className="text-left relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#087BFA] flex items-center justify-center font-bold text-xl mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-[#0B1B43] mb-2">Assess Skills</h3>
            <p className="text-sm text-[#405B8B] leading-relaxed">
              Select your target role and complete interactive diagnostic assessments across core technical categories.
            </p>
          </Card>

          <Card hoverEffect className="text-left relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#603DF5] flex items-center justify-center font-bold text-xl mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-[#0B1B43] mb-2">Identify Skill Gaps</h3>
            <p className="text-sm text-[#405B8B] leading-relaxed">
              Compare your current proficiency against benchmark requirements for full-stack, frontend, or backend roles.
            </p>
          </Card>

          <Card hoverEffect className="text-left relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center font-bold text-xl mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-[#0B1B43] mb-2">Follow Roadmap</h3>
            <p className="text-sm text-[#405B8B] leading-relaxed">
              Follow a step-by-step roadmap with high-quality free learning resources and capstone project evidence.
            </p>
          </Card>

          <Card hoverEffect className="text-left relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center font-bold text-xl mb-4">
              4
            </div>
            <h3 className="text-lg font-bold text-[#0B1B43] mb-2">Match & Get Hired</h3>
            <p className="text-sm text-[#405B8B] leading-relaxed">
              Share your verified Skill Passport with recruiters and unlock explainable skill-matched jobs.
            </p>
          </Card>
        </div>
      </section>

      {/* SECTION 2 & 3: ASSESSMENT & SKILL GAP ANALYSIS */}
      <section id="features" className="bg-white py-16 border-y border-[#E0E7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="blue" icon={<Brain className="w-3.5 h-3.5" />}>DIAGNOSTIC ASSESSMENT</Badge>
              <h2 className="text-3xl font-extrabold text-[#0B1B43]">Interactive Diagnostic Assessments</h2>
              <p className="text-[#405B8B] leading-relaxed text-sm">
                Move beyond self-reported claims. SARATHI’s interactive multiple-choice questions measure your practical code understanding, framework concepts, database design, and API security.
              </p>
              <ul className="space-y-3 text-sm text-[#0B1B43]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <span>Category-by-category proficiency scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <span>Actionable recommendations for improvement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <span>Clear distinction between estimates and verified project credentials</span>
                </li>
              </ul>
            </div>

            <Card className="bg-[#F4F7FC]">
              <h3 className="font-bold text-[#0B1B43] mb-4">Assessment Category Breakdown</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1 text-[#0B1B43]">
                    <span>Frontend (React, JS, HTML/CSS)</span>
                    <span className="text-[#087BFA]">80% Proficient</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#087BFA] h-full w-[80%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1 text-[#0B1B43]">
                    <span>Backend (Node.js, Express, REST APIs)</span>
                    <span className="text-[#603DF5]">65% Intermediate</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#603DF5] h-full w-[65%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1 text-[#0B1B43]">
                    <span>Databases (SQL & PostgreSQL)</span>
                    <span className="text-[#D97706]">50% Needs Practice</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#D97706] h-full w-[50%]" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 4 & 5: ROADMAP & PASSPORT */}
      <section id="students" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Card className="bg-gradient-to-tr from-[#0B1B43] to-[#1E293B] text-white p-8">
            <Badge variant="purple" className="mb-4">SKILL PASSPORT EVIDENCE</Badge>
            <h3 className="text-2xl font-bold mb-3 text-white">Verifiable Skill Passport</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Showcase a single, transparent record of your verified projects, assessed skill levels, and degree milestones.
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/10 flex items-center justify-between">
                <span>Self-Reported Skills</span>
                <span className="text-slate-300">Declared by Student</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 flex items-center justify-between">
                <span>Assessment Completed</span>
                <span className="text-blue-300 font-semibold">Verified via Test</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 flex items-center justify-between border border-emerald-500/40">
                <span>Verified Project Evidence</span>
                <span className="text-emerald-400 font-bold">GitHub Code & Live Demo</span>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Badge variant="purple" icon={<Map className="w-3.5 h-3.5" />}>PERSONALIZED ROADMAP</Badge>
            <h2 className="text-3xl font-extrabold text-[#0B1B43]">Step-by-Step Learning Roadmaps</h2>
            <p className="text-[#405B8B] leading-relaxed text-sm">
              Stop guessing what to learn next. SARATHI structures your growth into 6 strategic stages, pointing you to curated free resources, documentation, and real-world projects.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Button variant="purple" onClick={() => navigate('/student/roadmap')}>
                Explore Sample Roadmap
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: TRIPLE AUDIENCE BENEFITS */}
      <section id="recruiters" className="bg-[#F4F7FC] py-16 border-t border-[#E0E7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="navy" className="mb-3">BUILT FOR THE ENTIRE ECOSYSTEM</Badge>
            <h2 className="text-3xl font-extrabold text-[#0B1B43]">Empowering Students, Recruiters & Colleges</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Students */}
            <Card hoverEffect borderAccent="blue">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#087BFA] flex items-center justify-center mb-4">
                <Code className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1B43] mb-2">For Students</h3>
              <p className="text-xs text-[#405B8B] leading-relaxed mb-4">
                Understand exact skill gaps for your target role, follow structured learning steps, and demonstrate proof of work with live project links.
              </p>
              <button onClick={() => navigate('/student/dashboard')} className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1 cursor-pointer">
                <span>Open Student Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </Card>

            {/* For Recruiters */}
            <Card hoverEffect borderAccent="purple">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#603DF5] flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1B43] mb-2">For Recruiters</h3>
              <p className="text-xs text-[#405B8B] leading-relaxed mb-4">
                Find candidate profiles backed by verifiable code evidence rather than resume buzzwords. View explainable match scores for job postings.
              </p>
              <button onClick={() => navigate('/recruiter/dashboard')} className="text-xs font-bold text-[#603DF5] hover:underline flex items-center gap-1 cursor-pointer">
                <span>Explore Recruiter Portal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </Card>

            {/* For Colleges */}
            <Card hoverEffect borderAccent="green" id="colleges">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1B43] mb-2">For Colleges</h3>
              <p className="text-xs text-[#405B8B] leading-relaxed mb-4">
                Track aggregate placement readiness across departments, identify common batch skill gaps, and guide curriculum enhancements.
              </p>
              <button onClick={() => navigate('/college/dashboard')} className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1 cursor-pointer">
                <span>View Institutional Portal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#087BFA] via-[#603DF5] to-[#0B1B43] p-10 sm:p-16 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Ready to Master Your Career Path?</h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Join SARATHI today. Assess your skills, bridge your gaps, and unlock career opportunities backed by verified proof of work.
          </p>
          <div className="pt-4 flex justify-center">
            <Button
              size="lg"
              className="bg-white text-[#0B1B43] hover:bg-slate-100 shadow-xl px-10"
              onClick={() => navigate('/signup')}
              rightIcon={<ArrowRight className="w-5 h-5 text-[#087BFA]" />}
            >
              Get Started For Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
