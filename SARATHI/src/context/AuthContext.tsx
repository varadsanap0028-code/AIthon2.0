import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { UserProfile, UserRole, AuthState } from '../types/user';
import {
  StorageService,
  defaultDemoCollege
} from '../services/storageService';
import { recruiterApi } from '../services/recruiterApiService';
import { OpportunityService } from '../services/opportunityService';
import { apiClient } from '../services/apiClient';

interface GoogleAuthParams {
  credential?: string;
  portalHint?: UserRole;
  nonce?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: UserRole;
  rememberMe?: boolean;
}

interface AuthContextType extends AuthState {
  appMode: 'demo' | 'production';
  token: string | null;
  activeOrgId?: string | null;
  login: (email: string, passwordOrRole?: string | UserRole, role?: UserRole, rememberMe?: boolean) => Promise<UserProfile>;
  loginWithGoogle: (params: GoogleAuthParams) => Promise<UserProfile>;
  signup: (fullName: string, email: string, role: UserRole, password?: string, rememberMe?: boolean) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  loginAsNewStudent: (name?: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('sarathi_auth_token') || localStorage.getItem('sarathi_auth_token');
}

function persistSession(token: string, profile: UserProfile, rememberMe: boolean = true) {
  if (typeof window === 'undefined') return;
  if (rememberMe) {
    localStorage.setItem('sarathi_auth_token', token);
    localStorage.setItem('sarathi_auth_user', JSON.stringify(profile));
    localStorage.setItem('sarathi_remember_me', 'true');
    sessionStorage.removeItem('sarathi_auth_token');
    sessionStorage.removeItem('sarathi_auth_user');
  } else {
    sessionStorage.setItem('sarathi_auth_token', token);
    sessionStorage.setItem('sarathi_auth_user', JSON.stringify(profile));
    localStorage.removeItem('sarathi_auth_token');
    localStorage.removeItem('sarathi_auth_user');
    localStorage.removeItem('sarathi_remember_me');
  }
}

function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('sarathi_auth_token');
  sessionStorage.removeItem('sarathi_auth_user');
  sessionStorage.removeItem('sarathi_demo_college');
  localStorage.removeItem('sarathi_auth_token');
  localStorage.removeItem('sarathi_auth_user');
  localStorage.removeItem('sarathi_remember_me');
}

const mapBackendUserToProfile = (serverUser: any, organization?: any): UserProfile => {
  const mappedRole: UserRole =
    serverUser.role === 'platform_admin' ? 'platform_admin' :
    serverUser.role === 'recruiter' ? 'recruiter' :
    serverUser.role === 'college' ? 'college' : 'student';

  return {
    id: serverUser.id,
    email: serverUser.email,
    fullName: serverUser.fullName || serverUser.full_name || 'Sarathi User',
    role: mappedRole,
    roles: [mappedRole],
    lastLoginAt: serverUser.lastLoginAt || serverUser.last_login_at,
    companyName: organization?.name || serverUser.companyName || serverUser.company_name || (mappedRole === 'recruiter' ? 'NexTech Innovations' : undefined),
    institution: serverUser.institution || (mappedRole === 'student' ? 'National Institute of Technology' : undefined),
    avatarUrl: serverUser.avatarUrl || serverUser.avatar_url,
    targetRole: serverUser.targetRole || serverUser.target_role || 'Full-Stack Developer',
    headline: serverUser.headline || undefined,
    bio: serverUser.bio || undefined,
    degree: serverUser.degree || undefined,
    graduationYear: serverUser.graduationYear || serverUser.graduation_year || undefined,
    location: serverUser.location || undefined,
    githubUrl: serverUser.githubUrl || serverUser.github_url || undefined,
    linkedinUrl: serverUser.linkedinUrl || serverUser.linkedin_url || undefined,
    portfolioUrl: serverUser.portfolioUrl || serverUser.portfolio_url || undefined,
    resumeUrl: serverUser.resumeUrl || serverUser.resume_url || undefined,
    experienceYears: serverUser.experienceYears ?? serverUser.experience_years ?? undefined,
    workPreference: serverUser.workPreference || serverUser.work_preference || undefined,
    createdAt: serverUser.createdAt || serverUser.created_at || new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appMode, setAppMode] = useState<'demo' | 'production'>('demo');
  const [isDemo, setIsDemo] = useState<boolean>(true);

  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const logout = useCallback(() => {
    const currentToken = tokenRef.current || getStoredToken();
    if (currentToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(() => {});
    }

    setUser(null);
    setToken(null);
    setActiveOrgId(null);
    clearSession();
    recruiterApi.clearAuthCache();
    OpportunityService.clearAuthToken();
    StorageService.setActiveUser(null);

    // Broadcast across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('sarathi_auth_sync');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      }
    } catch {}
  }, []);

  // Synchronize authentication and logout state across open browser tabs
  useEffect(() => {
    let authChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        authChannel = new BroadcastChannel('sarathi_auth_sync');
        authChannel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            setUser(null);
            setToken(null);
            setActiveOrgId(null);
            clearSession();
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sarathi_auth_token' && !e.newValue) {
        setUser(null);
        setToken(null);
        setActiveOrgId(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      authChannel?.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Query server mode and restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // 1. Detect server mode
        let currentMode: 'demo' | 'production' = 'demo';
        try {
          const modeRes = await fetch('/api/auth/mode');
          if (modeRes.ok) {
            const modeData = await modeRes.json();
            currentMode = modeData.mode === 'production' ? 'production' : 'demo';
          }
        } catch {
          currentMode = 'demo';
        }

        if (!isMounted) return;
        setAppMode(currentMode);
        setIsDemo(currentMode === 'demo');

        // 2. Check for existing session token
        const savedToken = getStoredToken();
        if (savedToken) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${savedToken}` }
            });

            if (meRes.ok) {
              const meData = await meRes.json();
              
              // If user status is suspended or pending approval, revoke session
              if (meData.user?.status === 'suspended') {
                if (isMounted) logout();
                return;
              }

              const activeOrg = meData.organizations?.find((o: any) => o.id === meData.activeOrgId) || meData.organizations?.[0];
              const profile = mapBackendUserToProfile(meData.user, activeOrg);
              
              if (profile.role === 'student') {
                try {
                  const candRes = await fetch('/api/candidates/profile', {
                    headers: { Authorization: `Bearer ${savedToken}` }
                  });
                  if (candRes.ok) {
                    const candData = await candRes.json();
                    if (candData.data) {
                      Object.assign(profile, mapBackendUserToProfile(candData.data));
                    }
                  }
                } catch {
                  // Non-fatal fallback to basic user profile
                }
              }

              if (isMounted) {
                setUser(profile);
                setToken(savedToken);
                setActiveOrgId(meData.activeOrgId || activeOrg?.id || null);

                if (profile.role === 'recruiter') {
                  recruiterApi.setAuthToken(savedToken, meData.activeOrgId || activeOrg?.id);
                } else if (profile.role === 'student') {
                  OpportunityService.setAuthToken(savedToken);
                }
              }
            } else {
              // Token is invalid/expired
              if (isMounted) {
                logout();
              }
            }
          } catch {
            // If offline, check for cached user in storage
            const cachedUserStr = sessionStorage.getItem('sarathi_auth_user') || localStorage.getItem('sarathi_auth_user');
            if (cachedUserStr && isMounted) {
              try {
                const cachedUser = JSON.parse(cachedUserStr);
                setUser(cachedUser);
                setToken(savedToken);
              } catch {
                logout();
              }
            }
          }
        } else {
          // Check if demo college was active in demo mode
          const isDemoCollege = sessionStorage.getItem('sarathi_demo_college');
          if (isDemoCollege && currentMode === 'demo' && isMounted) {
            setUser(defaultDemoCollege);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(async (
    email: string,
    passwordOrRole?: string | UserRole,
    roleParam?: UserRole,
    rememberMe: boolean = true
  ): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Normalize parameters
      let password = '';
      let _targetRole: UserRole | undefined = roleParam;
      if (typeof passwordOrRole === 'string') {
        if (passwordOrRole === 'student' || passwordOrRole === 'recruiter' || passwordOrRole === 'college') {
          _targetRole = passwordOrRole;
        } else {
          password = passwordOrRole;
        }
      }
      void _targetRole;

      // College presentation demo account — ONLY when the exact demo email is used.
      // Do NOT shortcut just because the College tab is selected; real users must
      // always authenticate with their own email + password.
      if (cleanEmail === defaultDemoCollege.email.toLowerCase() && appMode === 'demo') {
        setUser(defaultDemoCollege);
        sessionStorage.setItem('sarathi_demo_college', 'true');
        sessionStorage.removeItem('sarathi_auth_token');
        sessionStorage.removeItem('sarathi_auth_user');
        return defaultDemoCollege;
      }

      // In demo mode, if password was omitted (e.g. via switchDemoRole), supply default demo credential
      if (!password && appMode === 'demo') {
        password = 'password123';
      }

      let res: Response;
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
      } catch {
        throw new Error('Backend server is unreachable on port 4000. Please start the server using run_all.bat or start_server.bat.');
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || errJson.error || errJson.message || 'Invalid email or password';
        throw new Error(errMsg);
      }

      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user, data.organization);
      setUser(profile);
      setToken(data.token);
      setActiveOrgId(data.organization?.id || null);

      persistSession(data.token, profile, rememberMe);
      sessionStorage.removeItem('sarathi_demo_college');

      if (profile.role === 'recruiter') {
        recruiterApi.setAuthToken(data.token, data.organization?.id);
      } else if (profile.role === 'student') {
        OpportunityService.setAuthToken(data.token);
      }

      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [appMode]);

  const signup = useCallback(async (
    fullName: string,
    email: string,
    role: UserRole,
    password?: string,
    rememberMe: boolean = true
  ): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const pwd = password || 'password123';

      let res: Response;
      try {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email: cleanEmail, password: pwd, role }),
        });
      } catch {
        throw new Error('Backend server is unreachable on port 4000. Please start the server using run_all.bat or start_server.bat.');
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || errJson.error || errJson.message || 'Failed to create account';
        throw new Error(errMsg);
      }

      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user, data.organization);
      setUser(profile);
      setToken(data.token);
      setActiveOrgId(data.organization?.id || null);

      persistSession(data.token, profile, rememberMe);
      sessionStorage.removeItem('sarathi_demo_college');

      if (profile.role === 'recruiter') {
        recruiterApi.setAuthToken(data.token, data.organization?.id);
      } else if (profile.role === 'student') {
        OpportunityService.setAuthToken(data.token);
      }

      return profile;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    if (token && user.role === 'student') {
      try {
        const res = await apiClient.put<{ success: boolean; data: any; message: string }>(
          '/api/candidates/profile',
          updates
        );
        if (res?.data) {
          const merged: UserProfile = {
            ...user,
            ...mapBackendUserToProfile(res.data)
          };
          setUser(merged);
          sessionStorage.setItem('sarathi_auth_user', JSON.stringify(merged));
          if (localStorage.getItem('sarathi_remember_me') === 'true') {
            localStorage.setItem('sarathi_auth_user', JSON.stringify(merged));
          }
          return;
        }
      } catch (err) {
        console.error('Failed to save profile to server:', err);
        throw err;
      }
    }

    const updatedUser: UserProfile = {
      ...user,
      ...updates
    };
    setUser(updatedUser);
    sessionStorage.setItem('sarathi_auth_user', JSON.stringify(updatedUser));
    if (localStorage.getItem('sarathi_remember_me') === 'true') {
      localStorage.setItem('sarathi_auth_user', JSON.stringify(updatedUser));
    }
  }, [user, token]);

  const switchDemoRole = useCallback(async (role: UserRole) => {
    if (appMode !== 'demo') return;
    if (role === 'student') {
      await login('student@sarathi.ai', 'password123', 'student');
    } else if (role === 'recruiter') {
      await login('recruiter@sarathi.ai', 'password123', 'recruiter');
    } else if (role === 'college') {
      await login('admin@apex.edu', 'password123', 'college');
    } else if (role === 'platform_admin') {
      await login('admin@sarathi.dev', 'password123', 'platform_admin');
    }
  }, [appMode, login]);

  const loginAsNewStudent = useCallback(async (name: string = 'Brand-New Student', email?: string) => {
    if (appMode !== 'demo') {
      throw new Error('Quick start is only permitted in demo mode.');
    }
    const cleanEmail = email || `student-${Date.now()}@sarathi.test`;
    let res: Response;
    try {
      res = await fetch('/api/auth/student-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email: cleanEmail,
          institution: 'Demonstration University',
          targetRole: 'Junior Developer'
        })
      });
    } catch {
      throw new Error('Backend server is unreachable on port 4000. Please start the server using run_all.bat or start_server.bat.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to initialize student demo session');
    }

    const data = await res.json();
    const profile = mapBackendUserToProfile(data.user);
    setUser(profile);
    setToken(data.token);
    persistSession(data.token, profile, false);
    sessionStorage.removeItem('sarathi_demo_college');
    OpportunityService.setAuthToken(data.token);
  }, [appMode]);

  const loginWithGoogle = useCallback(async (params: GoogleAuthParams): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const rememberMe = params.rememberMe ?? true;
      let res: Response;

      if (params.credential) {
        // Real Google Identity Services ID Token flow
        res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: params.credential,
            portalHint: params.portalHint || params.role || 'student',
            nonce: params.nonce,
          }),
        });
      } else {
        // Fallback for simulated profile in demo mode
        const cleanEmail = (params.email || '').toLowerCase().trim();
        const targetRole = params.role || params.portalHint || 'student';
        res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            fullName: params.fullName,
            avatarUrl: params.avatarUrl,
            role: targetRole,
          }),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || errJson.error || errJson.message || 'Failed to authenticate with Google';
        throw new Error(errMsg);
      }

      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user, data.organization);
      setUser(profile);
      setToken(data.token);
      setActiveOrgId(data.organization?.id || null);

      persistSession(data.token, profile, rememberMe);
      sessionStorage.removeItem('sarathi_demo_college');

      if (profile.role === 'recruiter') {
        recruiterApi.setAuthToken(data.token, data.organization?.id);
      } else if (profile.role === 'student') {
        OpportunityService.setAuthToken(data.token);
      }

      return profile;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isDemo,
        appMode,
        token,
        activeOrgId,
        login,
        loginWithGoogle,
        signup,
        updateProfile,
        logout,
        switchDemoRole,
        loginAsNewStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
