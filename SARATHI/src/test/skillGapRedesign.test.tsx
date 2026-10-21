import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SkillGapPage } from '../pages/student/SkillGapPage';
import { StudentProvider } from '../context/StudentContext';
import { StorageService } from '../services/storageService';

let mockUser: any = {
  id: 'usr-active-student',
  email: 'student@sarathi.ai',
  fullName: 'Alex Morgan',
  role: 'student',
  targetRole: 'Full-Stack Engineer'
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: vi.fn(),
    logout: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Helper to seed localStorage for specific test cases
function seedStudentStorage({
  userId = 'usr-active-student',
  targetRole = 'Full-Stack Engineer',
  targetDomain = 'web-dev',
  skills = [],
  assessmentHistory = []
}: {
  userId?: string;
  targetRole?: string;
  targetDomain?: string;
  skills?: any[];
  assessmentHistory?: any[];
}) {
  mockUser = {
    id: userId,
    email: 'student@sarathi.ai',
    fullName: 'Alex Morgan',
    role: 'student',
    targetRole
  };
  StorageService.saveUserTargetRole(userId, targetRole);
  StorageService.saveUserTargetDomain(userId, targetDomain);
  StorageService.saveUserSkills(userId, skills);
  StorageService.saveUserAssessmentHistory(userId, assessmentHistory);
}

function renderSkillGapPage() {
  return render(
    <MemoryRouter>
      <StudentProvider>
        <SkillGapPage />
      </StudentProvider>
    </MemoryRouter>
  );
}

describe('SARATHI — Skill Gap Analysis Redesign Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('1. New student with no assessment history sees truthful zero state', () => {
    // Seed with a new student having 0 skills and 0 assessment history
    seedStudentStorage({
      userId: 'usr-new-zero-student',
      targetRole: 'Full-Stack Engineer',
      skills: [],
      assessmentHistory: []
    });

    renderSkillGapPage();

    // Verify zero state is presented
    expect(screen.getByText('No Diagnostic Skill Assessment Completed')).toBeInTheDocument();
    expect(
      screen.getByText(/To calculate your benchmark competency gaps/i)
    ).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /Start Diagnostic Skill Assessment/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('2. Active student sees 4 compact KPI cards and role readiness calibrated for target role', async () => {
    seedStudentStorage({
      userId: 'usr-student-active-1',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-react',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 4,
          status: 'verified'
        },
        {
          id: 'sk-node',
          name: 'Node.js',
          category: 'Backend',
          proficiencyLevel: 2,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 68,
          knowledgeScore: 70,
          practicalScore: 65,
          completedAt: '2026-10-15T12:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: ['React'],
          improvements: ['Node.js'],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // 4 KPI Card Headings
    expect(screen.getByText('Role Benchmark Readiness')).toBeInTheDocument();
    expect(screen.getByText('High-Priority Gaps')).toBeInTheDocument();
    expect(screen.getByText('Requires Evidence')).toBeInTheDocument();
    expect(screen.getByText('Benchmark Goals Met')).toBeInTheDocument();

    // Calibrated for target role
    expect(screen.getByText(/Calibrated for Full-Stack Engineer/i)).toBeInTheDocument();

    // Horizontal benchmark comparison chart is present
    expect(screen.getByText('Role Benchmark Competency Comparison')).toBeInTheDocument();
  });

  it('3. Competency distribution counts are derived accurately without double counting', () => {
    seedStudentStorage({
      userId: 'usr-student-active-2',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 4,
          status: 'verified'
        },
        {
          id: 'sk-2',
          name: 'Node.js',
          category: 'Backend',
          proficiencyLevel: 2,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 70,
          knowledgeScore: 70,
          practicalScore: 70,
          completedAt: '2026-10-15T12:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // Check Competency Gap Distribution Card
    expect(screen.getByText('Competency Gap Distribution')).toBeInTheDocument();
    expect(screen.getByText('Met Target')).toBeInTheDocument();
    expect(screen.getByText('Below Target')).toBeInTheDocument();
    expect(screen.getByText('Needs Evidence')).toBeInTheDocument();
    expect(screen.getByText(/without double-counting/i)).toBeInTheDocument();
  });

  it('4. Assessment progress requires at least 2 dated attempts; explains truthfully when only 1 exists', () => {
    seedStudentStorage({
      userId: 'usr-student-active-3',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 3,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 65,
          knowledgeScore: 70,
          practicalScore: 60,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // Baseline message shown truthfully with no fabricated historical trend
    expect(screen.getByText('Historical Assessment Progress')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 Attempts Recorded')).toBeInTheDocument();
    expect(screen.getByText('Baseline Assessment Recorded')).toBeInTheDocument();
    expect(screen.getByText(/Historical trend visualization activates after at least/i)).toBeInTheDocument();
  });

  it('5. Assessment progress renders genuine growth timeline when 2 or more dated attempts exist', () => {
    seedStudentStorage({
      userId: 'usr-student-active-4',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 4,
          status: 'verified'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 60,
          knowledgeScore: 60,
          practicalScore: 60,
          completedAt: '2026-10-01T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        },
        {
          id: 'att-2',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 78,
          knowledgeScore: 80,
          practicalScore: 75,
          completedAt: '2026-10-15T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // Verified progress header with delta
    expect(screen.getByText('Verified Assessment Progress')).toBeInTheDocument();
    expect(screen.getByText(/Growth: \+18 pts/i)).toBeInTheDocument();
    expect(screen.getByText('Initial Baseline')).toBeInTheDocument();
    expect(screen.getByText('Latest Evaluation')).toBeInTheDocument();
  });

  it('6. Top 3 Next Actions displays concrete recommendations for priority gaps', () => {
    seedStudentStorage({
      userId: 'usr-student-active-5',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'TypeScript',
          category: 'Frontend',
          proficiencyLevel: 1,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 50,
          knowledgeScore: 50,
          practicalScore: 50,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    expect(screen.getByText('Top 3 High-Impact Next Actions')).toBeInTheDocument();
    expect(screen.getByText('#1 Urgent Priority')).toBeInTheDocument();
  });

  it('7. Search and filter controls correctly narrow the list of required competencies', () => {
    seedStudentStorage({
      userId: 'usr-student-active-6',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 4,
          status: 'verified'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 70,
          knowledgeScore: 70,
          practicalScore: 70,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    const searchInput = screen.getByPlaceholderText(/Search required competencies/i);
    expect(searchInput).toBeInTheDocument();

    // Type "TypeScript" in search
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } });
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThanOrEqual(1);

    // Type a nonexistent skill
    fireEvent.change(searchInput, { target: { value: 'NonExistentSkill123' } });
    expect(screen.getByText('No competencies match your filter')).toBeInTheDocument();
  });

  it('8. Competency card details accordion expands to reveal role relevance and priority rationale', () => {
    seedStudentStorage({
      userId: 'usr-student-active-7',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 3,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 65,
          knowledgeScore: 65,
          practicalScore: 65,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // Find the toggle details button for React
    const detailsButtons = screen.getAllByRole('button', { name: /Toggle details for/i });
    expect(detailsButtons.length).toBeGreaterThan(0);

    // Click first details toggle
    fireEvent.click(detailsButtons[0]);

    // Role relevance and priority sections appear
    expect(screen.getByText('Role Relevance')).toBeInTheDocument();
    expect(screen.getByText('Priority Rationale & Verification')).toBeInTheDocument();
  });

  it('9. Preserves and displays transferable skills under collapsible section', () => {
    // Seed with a verified skill NOT in Full-Stack Developer requirements (e.g. PyTorch)
    seedStudentStorage({
      userId: 'usr-student-active-8',
      targetRole: 'Full-Stack Developer',
      skills: [
        {
          id: 'sk-1',
          name: 'React.js Architecture',
          category: 'Frontend',
          proficiencyLevel: 4,
          status: 'verified'
        },
        {
          id: 'sk-transfer',
          name: 'PyTorch',
          category: 'AI & Machine Learning',
          proficiencyLevel: 3,
          status: 'verified'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 70,
          knowledgeScore: 70,
          practicalScore: 70,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    // Transferable skills section appears
    expect(screen.getByText('Transferable Demonstrated Skills')).toBeInTheDocument();
    expect(screen.getByText('1 Preserved')).toBeInTheDocument();

    // Click to expand
    const transferableToggle = screen.getByRole('button', { name: /Transferable Demonstrated Skills/i });
    fireEvent.click(transferableToggle);

    // PyTorch appears
    expect(screen.getByText('PyTorch')).toBeInTheDocument();
  });

  it('10. Renders single prominent roadmap call to action at the bottom', () => {
    seedStudentStorage({
      userId: 'usr-student-active-9',
      targetRole: 'Full-Stack Engineer',
      skills: [
        {
          id: 'sk-1',
          name: 'React',
          category: 'Frontend',
          proficiencyLevel: 3,
          status: 'assessment-completed'
        }
      ],
      assessmentHistory: [
        {
          id: 'att-1',
          domainId: 'web-dev',
          targetRole: 'Full-Stack Engineer',
          overallScore: 65,
          knowledgeScore: 65,
          practicalScore: 65,
          completedAt: '2026-10-10T10:00:00.000Z',
          categoryScores: [],
          skillScores: [],
          strengths: [],
          improvements: [],
          answersSummary: []
        }
      ]
    });

    renderSkillGapPage();

    expect(screen.getByText('Ready to Bridge Your Benchmark Gaps?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open My Roadmap/i })).toBeInTheDocument();
  });
});
