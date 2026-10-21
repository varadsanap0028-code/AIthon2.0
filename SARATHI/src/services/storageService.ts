import type { UserProfile } from '../types/user';
import type { SkillItem } from '../types/skill';
import type { StudentRoadmap } from '../types/roadmap';
import type { ProjectItem } from '../types/project';
import { initialStudentSkills } from '../data/mockSkills';
import { initialStudentRoadmap } from '../data/mockRoadmaps';
import { initialStudentProjects } from '../data/mockProjects';
import { resolveDomainTrack } from '../data/domainRoadmaps';

export const DEMO_STUDENT_ID = 'usr-student-demo';

export const defaultDemoStudent: UserProfile = {
  id: DEMO_STUDENT_ID,
  email: 'student@sarathi.ai',
  fullName: 'Alex Morgan',
  role: 'student',
  targetRole: 'Full-Stack Developer',
  institution: 'National Institute of Technology',
  degree: 'B.Tech Computer Science',
  graduationYear: '2026',
  bio: 'Passionate computer science student aiming to become a lead full-stack product engineer.',
  createdAt: '2026-08-01'
};

export const defaultDemoRecruiter: UserProfile = {
  id: 'usr-recruiter-demo',
  email: 'recruiter@nextech.com',
  fullName: 'Sarah Jenkins',
  role: 'recruiter',
  companyName: 'NexTech Innovations',
  bio: 'Senior Technical Recruiter looking for high-potential full-stack talent.',
  createdAt: '2026-08-10'
};

export const defaultDemoCollege: UserProfile = {
  id: 'usr-college-demo',
  email: 'placement@nit.edu',
  fullName: 'Dr. Ramesh Kumar',
  role: 'college',
  institution: 'National Institute of Technology',
  bio: 'Head of Training & Placement Cell.',
  createdAt: '2026-08-12'
};

const USERS_DB_KEY = 'sarathi_users_registry';
const ACTIVE_USER_KEY = 'sarathi_active_user';

// User Registry Helpers
export class StorageService {
  public static getAllUsers(): Record<string, UserProfile> {
    try {
      const data = localStorage.getItem(USERS_DB_KEY);
      if (!data) return {};
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  public static saveUser(user: UserProfile): void {
    try {
      const users = this.getAllUsers();
      users[user.id] = user;
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      
      // If updating active user, update active user storage too
      const active = this.getActiveUser();
      if (active && active.id === user.id) {
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      }
    } catch (e) {
      console.error('Error saving user to registry:', e);
    }
  }

  public static getUserById(id: string): UserProfile | null {
    if (id === DEMO_STUDENT_ID) return defaultDemoStudent;
    if (id === defaultDemoRecruiter.id) return defaultDemoRecruiter;
    if (id === defaultDemoCollege.id) return defaultDemoCollege;
    const users = this.getAllUsers();
    return users[id] || null;
  }

  public static getUserByEmail(email: string): UserProfile | null {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === defaultDemoStudent.email.toLowerCase()) return defaultDemoStudent;
    if (cleanEmail === defaultDemoRecruiter.email.toLowerCase()) return defaultDemoRecruiter;
    if (cleanEmail === defaultDemoCollege.email.toLowerCase()) return defaultDemoCollege;

    const users = this.getAllUsers();
    const found = Object.values(users).find(u => u.email.toLowerCase().trim() === cleanEmail);
    return found || null;
  }

  public static getActiveUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(ACTIVE_USER_KEY);
      if (!data) {
        // Fallback check old sarathi_user key
        const oldData = localStorage.getItem('sarathi_user');
        if (oldData) {
          const parsed = JSON.parse(oldData);
          return parsed;
        }
        return null;
      }
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public static setActiveUser(user: UserProfile | null): void {
    if (user) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      localStorage.setItem('sarathi_user', JSON.stringify(user));
      this.saveUser(user);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem('sarathi_user');
    }
  }

  // Scoped Data Methods
  public static getUserSkills(userId: string): SkillItem[] {
    try {
      const key = `sarathi_${userId}_skills`;
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);

      // If demo user and never initialized, return demo skills
      if (userId === DEMO_STUDENT_ID) {
        return initialStudentSkills;
      }

      // New user starts at ZERO skills!
      return [];
    } catch {
      return [];
    }
  }

  public static saveUserSkills(userId: string, skills: SkillItem[]): void {
    try {
      const key = `sarathi_${userId}_skills`;
      localStorage.setItem(key, JSON.stringify(skills));
    } catch (e) {
      console.error('Error saving user skills:', e);
    }
  }

  public static getUserRoadmap(userId: string, trackKey?: string): StudentRoadmap | null {
    try {
      // 1. If domain trackKey specified, check track-specific storage first
      if (trackKey) {
        const trackSpecificKey = `sarathi_${userId}_roadmap_${trackKey}`;
        const trackData = localStorage.getItem(trackSpecificKey);
        if (trackData) return JSON.parse(trackData);
      }

      // 2. Check active general roadmap
      const key = `sarathi_${userId}_roadmap`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed: StudentRoadmap = JSON.parse(data);
        if (trackKey) {
          const resolved = resolveDomainTrack(parsed.targetRole || parsed.domainId);
          if (resolved.trackKey === trackKey) {
            return parsed;
          }
          // Do not return a mismatched domain's roadmap when a specific track is requested
          return null;
        }
        return parsed;
      }

      // 3. If demo user and track is web-dev (or unspecified and user's targetRole is web-dev), return initial demo roadmap
      if (userId === DEMO_STUDENT_ID) {
        if (!trackKey || trackKey === 'web-dev') {
          return initialStudentRoadmap;
        }
      }

      // New user starts with NO roadmap (Not created)
      return null;
    } catch {
      return null;
    }
  }

  public static saveUserRoadmap(
    userId: string,
    roadmap: StudentRoadmap | null,
    trackKey?: string
  ): void {
    try {
      const key = `sarathi_${userId}_roadmap`;
      if (roadmap) {
        localStorage.setItem(key, JSON.stringify(roadmap));

        // Also persist track-isolated copy to prevent leakage when switching domains
        const effectiveTrack = trackKey || resolveDomainTrack(roadmap.targetRole || roadmap.domainId).trackKey;
        if (effectiveTrack) {
          const trackSpecificKey = `sarathi_${userId}_roadmap_${effectiveTrack}`;
          localStorage.setItem(trackSpecificKey, JSON.stringify(roadmap));
        }
      } else {
        localStorage.removeItem(key);
        if (trackKey) {
          localStorage.removeItem(`sarathi_${userId}_roadmap_${trackKey}`);
        }
      }
    } catch (e) {
      console.error('Error saving user roadmap:', e);
    }
  }

  public static getUserProjects(userId: string): ProjectItem[] {
    try {
      const key = `sarathi_${userId}_projects`;
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);

      // If demo user and never initialized, return demo projects
      if (userId === DEMO_STUDENT_ID) {
        return initialStudentProjects;
      }

      // New user starts with NO projects
      return [];
    } catch {
      return [];
    }
  }

  public static saveUserProjects(userId: string, projects: ProjectItem[]): void {
    try {
      const key = `sarathi_${userId}_projects`;
      localStorage.setItem(key, JSON.stringify(projects));
    } catch (e) {
      console.error('Error saving user projects:', e);
    }
  }

  public static getUserTargetRole(userId: string, fallbackRole?: string): string {
    try {
      const key = `sarathi_${userId}_targetRole`;
      const data = localStorage.getItem(key);
      if (data !== null && data.trim()) return data;

      if (fallbackRole && fallbackRole.trim() && fallbackRole !== 'Not selected yet') {
        localStorage.setItem(key, fallbackRole);
        return fallbackRole;
      }

      // Check user profile
      const user = this.getUserById(userId);
      if (user && user.targetRole) return user.targetRole;

      if (userId === DEMO_STUDENT_ID) return 'Full-Stack Developer';

      return fallbackRole || '';
    } catch {
      return fallbackRole || '';
    }
  }

  public static saveUserTargetRole(userId: string, role: string): void {
    try {
      const key = `sarathi_${userId}_targetRole`;
      localStorage.setItem(key, role);

      // Also update profile
      const user = this.getUserById(userId);
      if (user) {
        user.targetRole = role;
        this.saveUser(user);
      }
    } catch (e) {
      console.error('Error saving user target role:', e);
    }
  }

  public static getUserTargetDomain(userId: string, fallbackDomain?: string): string {
    try {
      const key = `sarathi_${userId}_targetDomain`;
      const data = localStorage.getItem(key);
      if (data !== null && data.trim()) return data;

      if (fallbackDomain && fallbackDomain.trim()) {
        localStorage.setItem(key, fallbackDomain);
        return fallbackDomain;
      }

      return fallbackDomain || '';
    } catch {
      return fallbackDomain || '';
    }
  }

  public static saveUserTargetDomain(userId: string, domainId: string): void {
    try {
      const key = `sarathi_${userId}_targetDomain`;
      localStorage.setItem(key, domainId);
    } catch (e) {
      console.error('Error saving user target domain:', e);
    }
  }

  public static getUserAssessmentHistory(userId: string): any[] {
    try {
      const key = `sarathi_${userId}_assessmentHistory`;
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      return [];
    } catch {
      return [];
    }
  }

  public static saveUserAssessmentHistory(userId: string, history: any[]): void {
    try {
      const key = `sarathi_${userId}_assessmentHistory`;
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving assessment history:', e);
    }
  }

  public static getUserReviewedGaps(userId: string): boolean {
    try {
      const key = `sarathi_${userId}_reviewedGaps`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  public static setUserReviewedGaps(userId: string, reviewed: boolean): void {
    try {
      const key = `sarathi_${userId}_reviewedGaps`;
      localStorage.setItem(key, reviewed ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving reviewed gaps status:', e);
    }
  }

  public static getUserOnboardingDismissed(userId: string): boolean {
    try {
      const key = `sarathi_${userId}_onboardingDismissed`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  public static setUserOnboardingDismissed(userId: string, dismissed: boolean): void {
    try {
      const key = `sarathi_${userId}_onboardingDismissed`;
      localStorage.setItem(key, dismissed ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving onboarding dismissed status:', e);
    }
  }

  public static getUserPassportReviewed(userId: string): boolean {
    try {
      const key = `sarathi_${userId}_reviewedPassport`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  public static setUserPassportReviewed(userId: string, reviewed: boolean): void {
    try {
      const key = `sarathi_${userId}_reviewedPassport`;
      localStorage.setItem(key, reviewed ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving reviewed passport status:', e);
    }
  }

  public static getUserWelcomeModalSeen(userId: string): boolean {
    try {
      const key = `sarathi_${userId}_welcomeModalSeen`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  public static setUserWelcomeModalSeen(userId: string, seen: boolean): void {
    try {
      const key = `sarathi_${userId}_welcomeModalSeen`;
      localStorage.setItem(key, seen ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving welcome modal status:', e);
    }
  }

  // Create brand new student profile
  public static createNewStudent(fullName: string, email: string): UserProfile {
    const cleanEmail = email.toLowerCase().trim();
    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      fullName: fullName.trim() || 'New Student',
      role: 'student',
      targetRole: undefined, // Must start with NO target role
      institution: '',
      degree: '',
      graduationYear: '',
      bio: '',
      createdAt: new Date().toISOString()
    };
    this.saveUser(newUser);
    return newUser;
  }
}
