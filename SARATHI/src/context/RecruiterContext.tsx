import React, { createContext, useContext, useState, useEffect } from 'react';
import { recruiterApi } from '../services/recruiterApiService';

interface RecruiterContextType {
  activeOrgId: string;
  setActiveOrgId: (id: string) => void;
  organizations: Array<{ id: string; name: string }>;
  refreshKey: number;
  triggerRefresh: () => void;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const RecruiterContext = createContext<RecruiterContextType | undefined>(undefined);

export const RecruiterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeOrgId, setActiveOrgIdState] = useState<string>('org-demo-1');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const organizations = [
    { id: 'org-demo-1', name: 'Sarathi Enterprise Systems' },
    { id: 'org-demo-2', name: 'Apex Cloud Innovations' },
  ];

  const setActiveOrgId = (id: string) => {
    setActiveOrgIdState(id);
    recruiterApi.setOrgId(id);
    setRefreshKey(k => k + 1);
  };

  const triggerRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    recruiterApi.setOrgId(activeOrgId);
  }, [activeOrgId]);

  return (
    <RecruiterContext.Provider
      value={{
        activeOrgId,
        setActiveOrgId,
        organizations,
        refreshKey,
        triggerRefresh,
        selectedJobId,
        setSelectedJobId,
        toast,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all transform animate-bounce bg-slate-900 text-white border border-slate-700">
          <span className={`w-2.5 h-2.5 rounded-full ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
          {toast.message}
        </div>
      )}
    </RecruiterContext.Provider>
  );
};

export const useRecruiter = () => {
  const context = useContext(RecruiterContext);
  if (!context) {
    throw new Error('useRecruiter must be used within a RecruiterProvider');
  }
  return context;
};
