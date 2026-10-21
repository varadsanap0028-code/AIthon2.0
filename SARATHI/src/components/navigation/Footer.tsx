import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { GitBranch, Globe, Share2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B1B43] text-white border-t border-slate-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <Logo size="md" lightMode={true} showTagline={true} />
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              AI-powered skill intelligence, personalized learning roadmaps, and verifiable skill passport for tomorrow’s leaders.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <GitBranch className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Globe className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Share2 className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li><Link to="/student/assessment" className="hover:text-[#087BFA]">Skill Assessment</Link></li>
              <li><Link to="/student/skill-gap" className="hover:text-[#087BFA]">Skill Gap Analysis</Link></li>
              <li><Link to="/student/roadmap" className="hover:text-[#087BFA]">Personalized Roadmap</Link></li>
              <li><Link to="/student/skill-passport" className="hover:text-[#087BFA]">Skill Passport</Link></li>
              <li><Link to="/student/opportunities" className="hover:text-[#087BFA]">Job Matching</Link></li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Portals</h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li><Link to="/student/dashboard" className="hover:text-[#087BFA]">Student Dashboard</Link></li>
              <li><Link to="/recruiter/dashboard" className="hover:text-[#087BFA]">Recruiter Portal</Link></li>
              <li><Link to="/college/dashboard" className="hover:text-[#087BFA]">College Portal</Link></li>
              <li><Link to="/login" className="hover:text-[#087BFA]">Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-[#087BFA]">Create Account</Link></li>
            </ul>
          </div>

          {/* Col 4: Trust & Tagline */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Built for Impact</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Empowering students, recruiters, and educational institutions with transparent, evidence-based skill evaluation.
            </p>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300">
              <span className="font-semibold text-blue-400 block mb-1">Strict Verification Policy</span>
              Self-reported skills are explicitly distinguished from verified project evidence.
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SARATHI Platform. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
