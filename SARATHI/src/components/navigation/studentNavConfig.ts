import React from 'react';
import {
  LayoutDashboard,
  Brain,
  Target,
  Map,
  FolderGit2,
  Briefcase,
  Award,
  BookOpen,
  HelpCircle,
  FileText
} from 'lucide-react';

export interface StudentNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export interface StudentNavSection {
  id: string;
  title: string;
  items: StudentNavItem[];
}

export const studentNavSections: StudentNavSection[] = [
  {
    id: 'career-dashboard',
    title: 'Career Dashboard',
    items: [
      { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'skill-intelligence',
    title: 'Skill Intelligence',
    items: [
      { label: 'Skill Assessment', path: '/student/assessment', icon: Brain },
      { label: 'Skill Gap Analysis', path: '/student/skill-gap', icon: Target },
      { label: 'My Roadmap', path: '/student/roadmap', icon: Map },
    ],
  },
  {
    id: 'evidence-opportunities',
    title: 'Evidence & Opportunities',
    items: [
      { label: 'Projects & Portfolio', path: '/student/projects', icon: FolderGit2 },
      { label: 'Skill Passport', path: '/student/skill-passport', icon: Award },
      { label: 'Skill Resume', path: '/student/resume', icon: FileText },
      { label: 'Jobs & Internships', path: '/student/opportunities', icon: Briefcase },
    ],
  },
  {
    id: 'learning-growth',
    title: 'Learning & Growth',
    items: [
      { label: 'Learning Library', path: '/student/resources', icon: BookOpen },
      { label: 'Help & Support', path: '/student/help', icon: HelpCircle },
    ],
  },
];
