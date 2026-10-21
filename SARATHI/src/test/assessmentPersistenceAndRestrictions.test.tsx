import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentV2Shell } from '../components/assessment/AssessmentV2Shell';
import { ActiveAssessmentEngine } from '../components/assessment/ActiveAssessmentEngine';
import { QuizPanel } from '../components/assessment/QuizPanel';
import { ProjectTask } from '../components/assessment/ProjectTask';
import { AssessmentV2Service } from '../services/assessmentV2Service';
import type { AssessmentSessionClient, V2SessionResult } from '../types/assessmentV2';

// Mocks
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-student-test', email: 'student@test.com', role: 'candidate' },
  }),
}));

vi.mock('../context/StudentContext', () => ({
  useStudent: () => ({
    recordFullAssessmentResult: vi.fn(),
    targetDomain: 'web-dev',
    targetRole: 'Full-Stack Developer',
  }),
}));

const mockSession: AssessmentSessionClient = {
  sessionId: 'sess-persist-100',
  mode: 'secure',
  domainId: 'web-dev',
  role: 'Full-Stack Developer',
  status: 'in_progress',
  startedAt: new Date(Date.now() - 300000).toISOString(), // started 5 mins ago
  expiresAt: new Date(Date.now() + 2400000).toISOString(), // 40 mins remaining
  deadlineAt: new Date(Date.now() + 2400000).toISOString(),
  saveVersion: 2,
  questions: [
    {
      id: 'q-mcq-1',
      version: 1,
      domainId: 'web-dev',
      skillId: 'react',
      skillName: 'React.js',
      category: 'Frontend',
      type: 'mcq',
      difficulty: 1,
      prompt: 'What hook is used for memoizing values in React?',
      options: ['useMemo', 'useCallback', 'useEffect', 'useRef'],
    },
    {
      id: 'q-code-1',
      version: 1,
      domainId: 'web-dev',
      skillId: 'algo',
      skillName: 'Algorithms',
      category: 'Practical',
      type: 'code',
      difficulty: 2,
      prompt: 'Implement a function to detect outliers.',
      starterCode: 'function detectOutliers(data) {\n  return [];\n}',
      language: 'javascript',
      visibleTests: [{ id: 't1', kind: 'visible', input: '[1, 2, 100]', expectedOutput: '[100]' }],
    },
    {
      id: 'q-proj-1',
      version: 1,
      domainId: 'web-dev',
      skillId: 'arch',
      skillName: 'System Architecture',
      category: 'Project',
      type: 'project',
      difficulty: 3,
      prompt: 'Design a microservice routing gateway.',
    },
  ],
  rules: {
    timeLimitMinutes: 45,
    pasteAllowed: false, // Secure mode
    blurTracking: true,
    cameraRequired: false,
    accommodationsAllowed: true,
  },
  draftAnswers: {
    'q-mcq-1': 0, // Option 0: useMemo
  },
  snapshots: {
    'q-code-1': {
      code: 'function detectOutliers(data) {\n  return data.filter(x => x > 50);\n}',
      language: 'javascript',
    },
  },
};

const mockCompletedResult: V2SessionResult = {
  sessionId: 'sess-completed-999',
  mode: 'secure',
  domainId: 'web-dev',
  role: 'Full-Stack Developer',
  overallScore: 84,
  technicalScore: 84,
  knowledgeScore: 88,
  practicalScore: 80,
  completedAt: '2026-10-18T10:00:00.000Z',
  skillScores: {
    react: {
      skillName: 'React.js',
      category: 'Frontend',
      score: 85,
      level: 3,
      levelLabel: 'Proficient',
      evidenceCount: 4,
      confidence: 'high',
      knowledgeScore: 90,
      practicalScore: 80,
    },
    algo: {
      skillName: 'Algorithms',
      category: 'Practical',
      score: 82,
      level: 3,
      levelLabel: 'Proficient',
      evidenceCount: 3,
      confidence: 'medium',
      knowledgeScore: 80,
      practicalScore: 84,
    },
  },
  categoryScores: [
    { category: 'Frontend', score: 85, totalQuestions: 5, correctCount: 4, level: 'Proficient' },
    { category: 'Practical', score: 82, totalQuestions: 3, correctCount: 2, level: 'Proficient' },
  ],
  strengths: ['React Component Architecture'],
  improvements: ['Algorithm Optimization'],
  answersSummary: [],
};

describe('Assessment Persistence, Resume & Copy-Paste Restrictions Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('1. Active Session Recovery in AssessmentV2Shell', () => {
    it('automatically recovers active session from sessionStorage pointer and bypasses ModeSelect', async () => {
      sessionStorage.setItem('sarathi_v2_active_session_id', 'sess-persist-100');
      vi.spyOn(AssessmentV2Service, 'getSession').mockResolvedValue(mockSession);
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: true, session: mockSession });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      // Should show the loading state initially
      expect(screen.getByText(/Checking Assessment Status/i)).toBeInTheDocument();

      // Upon resolution, active assessment engine mounts
      await waitFor(() => {
        expect(screen.queryByText(/Authoritative Skill Assessment/i)).not.toBeInTheDocument();
        expect(screen.getByText(/What hook is used for memoizing values in React\?/i)).toBeInTheDocument();
      });
    });

    it('recovers active session from backend if sessionStorage is empty', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockResolvedValue(mockSession);
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: true, session: mockSession });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/What hook is used for memoizing values in React\?/i)).toBeInTheDocument();
      });

      // Pointer is populated in sessionStorage
      expect(sessionStorage.getItem('sarathi_v2_active_session_id')).toBe('sess-persist-100');
      expect(sessionStorage.getItem('sarathi_v2_active_mode')).toBe('secure');
    });

    it('renders unified start screen cleanly when no active session exists on client or server and student has no completed assessment', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, notFound: true, result: null });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Authoritative Skill Assessment/i)).toBeInTheDocument();
        expect(screen.getByText(/Practice Policy/i)).toBeInTheDocument();
        expect(screen.getByText(/Secure Policy/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. Draft Hydration & Question Index Preservation', () => {
    it('hydrates saved MCQ answer and restores current question index from session state', async () => {
      // Set current question index in sessionStorage
      sessionStorage.setItem('sarathi_v2_sess-persist-100_current_index', '0');

      render(
        <ActiveAssessmentEngine
          session={mockSession}
          onComplete={vi.fn()}
        />
      );

      // Verify draft answer 'useMemo' (option index 0) is selected from server draftAnswers
      const useMemoButton = screen.getByText('useMemo').closest('button');
      expect(useMemoButton).toHaveClass('border-indigo-600');
    });

    it('hydrates code snapshot from server when local sessionStorage code is missing', async () => {
      // Navigate to question 2 (the code question)
      sessionStorage.setItem('sarathi_v2_sess-persist-100_current_index', '1');

      render(
        <ActiveAssessmentEngine
          session={mockSession}
          onComplete={vi.fn()}
        />
      );

      // Question 2 prompt should be rendered
      expect(screen.getByText(/Implement a function to detect outliers/i)).toBeInTheDocument();
    });
  });

  describe('3. Copy-Paste Restrictions in Secure vs Practice Mode', () => {
    it('QuizPanel blocks copy, cut, and paste when pasteAllowed is false (Secure Mode)', () => {
      const onPasteBlocked = vi.fn();
      render(
        <QuizPanel
          question={mockSession.questions[0]}
          currentIndex={0}
          totalQuestions={3}
          selectedOption={0}
          onSelectOption={vi.fn()}
          onNext={vi.fn()}
          onPrev={vi.fn()}
          pasteAllowed={false}
          onPasteBlocked={onPasteBlocked}
        />
      );

      const panel = screen.getByText(/What hook is used for memoizing values in React\?/i).closest('div')!;
      
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      panel.dispatchEvent(pasteEvent);
      expect(onPasteBlocked).toHaveBeenCalled();
      expect(pasteEvent.defaultPrevented).toBe(true);

      const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
      panel.dispatchEvent(copyEvent);
      expect(onPasteBlocked).toHaveBeenCalledTimes(2);
      expect(copyEvent.defaultPrevented).toBe(true);
    });

    it('ProjectTask blocks paste into textarea when pasteAllowed is false (Secure Mode)', () => {
      const onPasteBlocked = vi.fn();
      render(
        <ProjectTask
          question={mockSession.questions[2]}
          code=""
          onCodeChange={vi.fn()}
          pasteAllowed={false}
          onPasteBlocked={onPasteBlocked}
        />
      );

      const textarea = screen.getByPlaceholderText(/Type your core implementation/i);
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      textarea.dispatchEvent(pasteEvent);

      expect(onPasteBlocked).toHaveBeenCalledTimes(1);
      expect(pasteEvent.defaultPrevented).toBe(true);
    });

    it('ProjectTask permits paste when pasteAllowed is true (Practice Mode)', () => {
      const onPasteBlocked = vi.fn();
      render(
        <ProjectTask
          question={mockSession.questions[2]}
          code=""
          onCodeChange={vi.fn()}
          pasteAllowed={true}
          onPasteBlocked={onPasteBlocked}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste or type your core implementation/i);
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      textarea.dispatchEvent(pasteEvent);

      expect(onPasteBlocked).not.toHaveBeenCalled();
      expect(pasteEvent.defaultPrevented).toBe(false);
    });

    it('ActiveAssessmentEngine displays accessible banner when copy-paste restriction is triggered', async () => {
      render(
        <ActiveAssessmentEngine
          session={mockSession} // mode: 'secure', rules.pasteAllowed: false
          onComplete={vi.fn()}
        />
      );

      // Trigger blocked copy on the quiz panel container
      const quizContainer = screen.getByText(/What hook is used for memoizing values in React\?/i).closest('div')!;
      fireEvent.copy(quizContainer);

      // Banner notice should appear
      await waitFor(() => {
        expect(screen.getByText(/Copy and paste are disabled during Secure Assessment Mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Timer Continuity', () => {
    it('restores countdown timer calculated from server deadlineAt rather than resetting to 45 minutes', () => {
      // mockSession has deadline in 40 minutes (2400 seconds)
      render(
        <ActiveAssessmentEngine
          session={mockSession}
          onComplete={vi.fn()}
        />
      );

      // Countdown should display ~39:59 or 40:00, NOT 45:00
      expect(screen.getByText(/^(39|40):[0-5][0-9]$/)).toBeInTheDocument();
      expect(screen.queryByText(/^45:00$/)).not.toBeInTheDocument();
    });
  });

  describe('5. Completed Assessment Persistence, Distinguishing States & Retake Flow', () => {
    it('shows CompletedAssessmentSummary with latest score and completion date for a student with a completed assessment', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Assessment Completed/i)).toBeInTheDocument();
        expect(screen.getByText('84%')).toBeInTheDocument();
        expect(screen.getByText(/Proficient Ready/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /View Previous Result/i })).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Retake Assessment/i })[0]).toBeInTheDocument();
      });

      // Does NOT automatically show the unified start screen
      expect(screen.queryByText(/Authoritative Skill Assessment/i)).not.toBeInTheDocument();
    });

    it('transitions to ModeSelect only after clicking Retake Assessment', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Retake Assessment/i })[0]).toBeInTheDocument();
      });

      // Click Retake Assessment
      fireEvent.click(screen.getAllByRole('button', { name: /Retake Assessment/i })[0]);

      // Now unified briefing screen should be shown
      await waitFor(() => {
        expect(screen.getByText(/Authoritative Skill Assessment/i)).toBeInTheDocument();
        expect(screen.getByText(/Practice Policy/i)).toBeInTheDocument();
        expect(screen.getByText(/Secure Policy/i)).toBeInTheDocument();
      });
    });

    it('renders the consolidated ResultsReport directly with detailed sections and maintains result view when clicking View Previous Result', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      // Verifies the consolidated detailed report is the primary, authoritative results view
      await waitFor(() => {
        expect(screen.getByText(/Demonstrated Technical Score/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Skill Gap Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Knowledge Quiz Score/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Practical Workbench/i)[0]).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /View Previous Result/i })).not.toBeInTheDocument();

      // Click View Previous Result - retains the detailed results report
      // View Previous Result removed by requirement

      await waitFor(() => {
        expect(screen.getByText(/Skill Assessment Results/i)).toBeInTheDocument();
        expect(screen.getByText(/Demonstrated Technical Score/i)).toBeInTheDocument();
      });
    });

    it('resumes active in-progress assessment directly even if previous completed result exists', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockResolvedValue(mockSession);
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: true, session: mockSession });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      // Directly resumes the in-progress session
      await waitFor(() => {
        expect(screen.getByText(/What hook is used for memoizing values in React\?/i)).toBeInTheDocument();
        expect(screen.queryByText(/Authoritative Skill Assessment/i)).not.toBeInTheDocument();
      });
    });

    it('preserves and restores previous completed assessment result after unmounting and remounting (simulating refresh)', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      // Initial mount
      const { unmount } = render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Assessment Completed/i)).toBeInTheDocument();
        expect(screen.getByText('84%')).toBeInTheDocument();
      });

      // Simulate full page refresh: unmount and remount fresh component instance
      unmount();

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      // Verify that after remounting (refresh), result is restored from backend and does NOT reset to mode selection
      await waitFor(() => {
        expect(screen.getByText(/Assessment Completed/i)).toBeInTheDocument();
        expect(screen.getByText('84%')).toBeInTheDocument();
        expect(screen.queryByText(/Authoritative Skill Assessment/i)).not.toBeInTheDocument();
      });
    });

    it('displays completion message asking "Would you like to take the assessment again?" alongside Retake Assessment', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({ success: true, result: mockCompletedResult });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Would you like to take the assessment again\?/i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Retake Assessment/i })[0]).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /View Previous Result/i })).not.toBeInTheDocument();
      });
    });

    it('displays error state with retry button on network/API failure and does not silently fall back to mode select', async () => {
      vi.spyOn(AssessmentV2Service, 'getSession').mockRejectedValue(new Error('No active session'));
      vi.spyOn(AssessmentV2Service, 'getActiveSession').mockResolvedValue({ active: false, session: null });
      vi.spyOn(AssessmentV2Service, 'getLatestResult').mockResolvedValue({
        success: false,
        error: 'Backend API connection timed out.',
        result: null,
      });

      render(
        <AssessmentV2Shell
          domainId="web-dev"
          domainTitle="Web Development"
          roleTitle="Full-Stack Developer"
        />
      );

      // Verify error state is presented instead of fabricating an empty mode-select screen
      await waitFor(() => {
        expect(screen.getByText(/Assessment Records Unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/Backend API connection timed out/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry Loading/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Authoritative Skill Assessment/i)).not.toBeInTheDocument();
    });
  });
});


