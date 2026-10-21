import React, { useState, useMemo } from 'react';
import {
  Globe,
  Brain,
  BarChart3,
  ShieldAlert,
  Cloud,
  Smartphone,
  Code2,
  Database,
  Layout,
  Cpu,
  Search,
  CheckCircle2,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  Target,
  X
} from 'lucide-react';
import { techDomains, getRoleRequirements, type TechDomain } from '../../data/domainsCatalog';

interface DomainRoleSelectorProps {
  selectedDomainId: string;
  selectedRoleTitle: string;
  onSelectRole: (roleTitle: string, domainId: string) => void;
  onDomainChange?: (domainId: string) => void;
  variant?: 'inline' | 'compact' | 'modal';
  showOverview?: boolean;
}

const domainIcons: Record<string, React.ReactNode> = {
  'web-dev': <Globe className="w-4 h-4" />,
  'ai-ml': <Brain className="w-4 h-4" />,
  'data-science': <BarChart3 className="w-4 h-4" />,
  'cybersecurity': <ShieldAlert className="w-4 h-4" />,
  'cloud-devops': <Cloud className="w-4 h-4" />,
  'mobile-dev': <Smartphone className="w-4 h-4" />,
  'software-eng': <Code2 className="w-4 h-4" />,
  'database-platforms': <Database className="w-4 h-4" />,
  'ui-ux-design': <Layout className="w-4 h-4" />,
  'emerging-tech': <Cpu className="w-4 h-4" />
};

export const DomainRoleSelector: React.FC<DomainRoleSelectorProps> = ({
  selectedDomainId,
  selectedRoleTitle,
  onSelectRole,
  onDomainChange,
  variant = 'inline',
  showOverview = true
}) => {
  const [activeDomainId, setActiveDomainId] = useState<string>(selectedDomainId || 'web-dev');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Synchronize internal domain if prop changes
  React.useEffect(() => {
    if (selectedDomainId && selectedDomainId !== activeDomainId) {
      setActiveDomainId(selectedDomainId);
    }
  }, [selectedDomainId]);

  const handleDomainClick = (domainId: string) => {
    setActiveDomainId(domainId);
    if (onDomainChange) {
      onDomainChange(domainId);
    }
  };

  const activeDomain = useMemo(() => {
    return techDomains.find(d => d.id === activeDomainId) || techDomains[0];
  }, [activeDomainId]);

  // Filtered roles based on active domain and search query
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) {
      return activeDomain.roleTitles.map(title => ({
        title,
        domain: activeDomain,
        reqs: getRoleRequirements(title)
      }));
    }

    const term = searchTerm.toLowerCase().trim();
    // Search across ALL domains if user types a search term
    const matched: { title: string; domain: TechDomain; reqs: ReturnType<typeof getRoleRequirements> }[] = [];

    techDomains.forEach(domain => {
      domain.roleTitles.forEach(title => {
        const reqs = getRoleRequirements(title);
        const matchesTitle = title.toLowerCase().includes(term);
        const matchesSkill = reqs.requiredSkills.some(s => s.skillName.toLowerCase().includes(term));
        const matchesDesc = reqs.description.toLowerCase().includes(term);

        if (matchesTitle || matchesSkill || matchesDesc) {
          matched.push({ title, domain, reqs });
        }
      });
    });

    return matched;
  }, [activeDomain, searchTerm]);

  const selectedReqs = useMemo(() => {
    return getRoleRequirements(selectedRoleTitle);
  }, [selectedRoleTitle]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Domain dropdown */}
        <div className="sm:w-56">
          <label className="block text-[10px] font-bold text-[#405B8B] uppercase mb-1">Domain</label>
          <select
            value={activeDomainId}
            onChange={(e) => {
              handleDomainClick(e.target.value);
              const domain = techDomains.find(d => d.id === e.target.value);
              if (domain && domain.roleTitles.length > 0) {
                onSelectRole(domain.roleTitles[0], domain.id);
              }
            }}
            className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-xs font-bold text-[#0B1B43] bg-white focus:ring-2 focus:ring-[#087BFA]"
          >
            {techDomains.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        {/* Role dropdown */}
        <div className="sm:w-64">
          <label className="block text-[10px] font-bold text-[#405B8B] uppercase mb-1">Career Role</label>
          <select
            value={selectedRoleTitle || activeDomain.roleTitles[0]}
            onChange={(e) => onSelectRole(e.target.value, activeDomainId)}
            className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-xs font-bold text-[#0B1B43] bg-white focus:ring-2 focus:ring-[#087BFA]"
          >
            {activeDomain.roleTitles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const containerClasses = variant === 'modal'
    ? 'space-y-5'
    : 'space-y-6 bg-white p-5 sm:p-7 rounded-3xl border border-[#E0E7F2] shadow-xs';

  return (
    <div className={containerClasses}>
      {/* HEADER (Only when NOT inside modal to avoid double-headers) */}
      {variant !== 'modal' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0E7F2] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-[#087BFA]">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-[#0B1B43]">Technology Domain & Target Career Role</h3>
            </div>
            <p className="text-xs text-[#405B8B] mt-0.5">
              Select your career domain and role to calibrate benchmark competencies, diagnostic assessments, and roadmaps.
            </p>
          </div>
        </div>
      )}

      {/* TWO-COLUMN SPACIOUS WORKSPACE (MASTER-DETAIL) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: DOMAIN DIRECTORY (md:col-span-4 lg:col-span-4) */}
        <div className="md:col-span-4 lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between pb-1">
            <label className="text-[11px] font-extrabold text-[#405B8B] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#087BFA]" />
              <span>1. Choose Domain</span>
            </label>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {techDomains.length} Tracks
            </span>
          </div>

          {/* Desktop Vertical List / Mobile Horizontal Bar */}
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-thin max-h-[420px] md:overflow-y-auto pr-0 md:pr-1">
            {techDomains.map(d => {
              const isActive = d.id === activeDomainId && !searchTerm.trim();

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    handleDomainClick(d.id);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs transition-all border shrink-0 text-left cursor-pointer group ${
                    isActive
                      ? 'bg-[#087BFA] text-white border-[#087BFA] shadow-md font-bold'
                      : 'bg-[#F8FAFC] text-[#405B8B] border-[#E0E7F2] hover:bg-white hover:text-[#0B1B43] hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#087BFA] group-hover:bg-blue-100'
                    }`}>
                      {domainIcons[d.id] || <Briefcase className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate font-semibold text-xs leading-tight">
                      {d.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {d.roleTitles.length}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 hidden md:inline transition-transform ${
                      isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CAREER ROLES IN SELECTED DOMAIN (md:col-span-8 lg:col-span-8) */}
        <div className="md:col-span-8 lg:col-span-8 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <div>
              <label className="text-[11px] font-extrabold text-[#405B8B] uppercase tracking-wider block">
                2. Choose Specialization in <span className="text-[#087BFA]">{activeDomain.title}</span>
              </label>
              {selectedRoleTitle && (
                <span className="text-xs text-slate-500 font-medium">
                  Active selection: <strong className="text-[#0B1B43]">{selectedRoleTitle}</strong>
                </span>
              )}
            </div>

            {/* Role Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter roles or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 rounded-xl border border-[#E0E7F2] text-xs text-[#0B1B43] bg-[#F8FAFC] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#087BFA] focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Role Cards Grid */}
          {filteredRoles.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="text-xs font-bold text-[#0B1B43]">No roles matched "{searchTerm}"</p>
              <p className="text-xs text-[#405B8B]">Try searching for another skill (e.g. Python, React, Cloud, DevOps) or reset the filter.</p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs font-bold text-[#087BFA] hover:underline cursor-pointer pt-1"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredRoles.map(({ title, domain, reqs }) => {
                const isSelected = selectedRoleTitle === title;

                return (
                  <div
                    key={title}
                    onClick={() => onSelectRole(title, domain.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'border-[#087BFA] bg-blue-50/70 shadow-sm ring-2 ring-[#087BFA]/20'
                        : 'border-[#E0E7F2] bg-white hover:border-blue-300 hover:bg-slate-50/70 hover:shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-extrabold text-sm text-[#0B1B43] leading-snug group-hover:text-[#087BFA] transition-colors">
                            {title}
                          </h4>
                          <span className="inline-block text-[10px] font-bold text-slate-500">
                            {domain.title}
                          </span>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#087BFA] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-[#087BFA] shrink-0 transition-colors" />
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#405B8B] mt-2 line-clamp-2 leading-relaxed">
                        {reqs.description}
                      </p>

                      {/* Benchmark Skills Preview Tags */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {reqs.requiredSkills.slice(0, 3).map(skill => (
                          <span
                            key={skill.skillName}
                            className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-[#0B1B43] border border-slate-200/60 truncate max-w-[120px]"
                          >
                            {skill.skillName}
                          </span>
                        ))}
                        {reqs.requiredSkills.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-slate-500 bg-slate-50">
                            +{reqs.requiredSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-[#405B8B]">
                      <span>{reqs.requiredSkills.length} benchmark skills</span>
                      <span className={`font-bold ${isSelected ? 'text-[#087BFA]' : 'text-slate-400 group-hover:text-[#087BFA]'}`}>
                        {isSelected ? 'Selected Target' : 'Select Role'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE ROLE SUMMARY BANNER (PROPER STRUCTURED SPECIFICATION) */}
      {showOverview && selectedRoleTitle && selectedReqs.requiredSkills.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3.5">
          {/* Header Row: Target Role & Domain Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100/90 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100 text-[#087BFA] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Target Role
                </span>
                <h4 className="text-base font-black text-[#0B1B43] tracking-tight">
                  {selectedRoleTitle}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#087BFA] px-3 py-1 rounded-full bg-white border border-blue-200 shadow-2xs">
                {selectedReqs.domainTitle}
              </span>
            </div>
          </div>

          {/* Role Description (Full text, clear, no truncation) */}
          <p className="text-xs sm:text-sm text-[#405B8B] leading-relaxed">
            {selectedReqs.description}
          </p>

          {/* Benchmarks Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#0B1B43] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#087BFA]" />
                <span>Benchmarks:</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {selectedReqs.requiredSkills.length} Calibrated Competencies
              </span>
            </div>

            {/* Grid of Benchmark Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {selectedReqs.requiredSkills.map(skill => (
                <div
                  key={skill.skillName}
                  className="p-3 rounded-xl bg-white border border-blue-100/90 shadow-2xs flex flex-col justify-between space-y-1.5 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-xs text-[#0B1B43] leading-snug">
                      {skill.skillName}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-[#087BFA] shrink-0">
                      Lvl {skill.requiredProficiency}/5
                    </span>
                  </div>
                  {skill.whyItMatters && (
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {skill.whyItMatters}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
