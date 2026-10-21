import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResultsReport } from '../components/assessment/ResultsReport';
import type { V2SessionResult } from '../types/assessmentV2';
import { StudentProvider } from '../context/StudentContext';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const mockHandlers = {
  onRetake: vi.fn(),
  onNavigateRoadmap: vi.fn(),
  onNavigateSkillGap: vi.fn(),
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StudentProvider>
          {ui}
        </StudentProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Redesigned ResultsReport Component Suite', () => {
  it('1. Renders high score result with Tier 1 badge and knowledge/practical breakdown', () => {
    const highScoreResult: V2SessionResult = {
      sessionId: 'sess-high',
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      technicalScore: 92,
      knowledgeScore: 90,
      practicalScore: 95,
      completedAt: '2026-10-18T10:00:00.000Z',
      skillScores: {
        'PyTorch': {
          skillName: 'PyTorch',
          category: 'AI & Machine Learning',
          score: 95,
          level: 5,
          levelLabel: 'Expert',
          evidenceCount: 4,
          confidence: 'high',
          knowledgeScore: 90,
          practicalScore: 100,
        },
      },
      categoryScores: [],
      strengths: ['Deep neural architecture'],
      improvements: [],
      answersSummary: [
        {
          questionId: 'q1',
          question: 'What is backpropagation?',
          skillName: 'PyTorch',
          selectedOption: 0,
          correctOption: 0,
          isCorrect: true,
          explanation: 'Reverse-mode auto-differentiation.',
        },
      ],
      practicalSummary: [
        {
          taskId: 't1',
          taskTitle: 'Build Softmax Layer',
          skillName: 'PyTorch',
          isPassed: true,
          feedback: 'All 3 tests passed',
          visiblePassed: 3,
          visibleTotal: 3,
          hiddenPassed: 5,
          hiddenTotal: 5,
          score: 100,
        },
      ],
    };

    renderWithProviders(<ResultsReport result={highScoreResult} {...mockHandlers} />);

    expect(screen.getByText('92%')).toBeDefined();
    expect(screen.getByText('Interview Ready (Tier 1)')).toBeDefined();
    expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('95%').length).toBeGreaterThan(0);
    expect(screen.getByText('Diagnostic Evidence Recorded')).toBeDefined();
  });

  it('2. Renders all-zero score result truthfully without false verification', () => {
    const zeroScoreResult: V2SessionResult = {
      sessionId: 'sess-zero',
      mode: 'secure',
      domainId: 'data-science',
      role: 'Data Scientist',
      technicalScore: 0,
      knowledgeScore: 0,
      practicalScore: 0,
      completedAt: '2026-10-18T11:00:00.000Z',
      skillScores: {
        'Scikit-Learn': {
          skillName: 'Scikit-Learn',
          category: 'Data Science & Analytics',
          score: 0,
          level: 1,
          levelLabel: 'Beginner',
          evidenceCount: 1,
          confidence: 'low',
          knowledgeScore: 0,
          practicalScore: 0,
        },
      },
      categoryScores: [],
      strengths: [],
      improvements: ['Scikit-Learn fundamentals'],
      answersSummary: [
        {
          questionId: 'q-zero',
          question: 'What is IQR?',
          skillName: 'Scikit-Learn',
          selectedOption: 2,
          correctOption: 0,
          isCorrect: false,
          explanation: 'IQR is Q3 - Q1.',
        },
      ],
      practicalSummary: [],
    };

    renderWithProviders(<ResultsReport result={zeroScoreResult} {...mockHandlers} />);

    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.getByText('Foundational Stage (Tier 4)')).toBeDefined();
    expect(screen.queryByText(/verified professional competence/i)).toBeNull();
  });

  it('3. Clearly displays NOT EXECUTED and infrastructure notice when runtime is unavailable', () => {
    const infraErrorResult: V2SessionResult = {
      sessionId: 'sess-infra',
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      technicalScore: 50,
      knowledgeScore: 50,
      practicalScore: 0,
      completedAt: '2026-10-18T12:00:00.000Z',
      hasInfrastructureError: true,
      skillScores: {},
      categoryScores: [],
      strengths: [],
      improvements: [],
      answersSummary: [],
      practicalSummary: [
        {
          taskId: 't-infra',
          taskTitle: 'Execute Python Sandbox',
          skillName: 'Python 3',
          isPassed: false,
          isInfrastructureError: true,
          executionStatus: 'runtime_unavailable',
          feedback: 'Execution halted: Runtime unavailable on server (NOT EXECUTED)',
          visiblePassed: 0,
          visibleTotal: 3,
          hiddenPassed: 0,
          hiddenTotal: 5,
          score: 0,
        },
      ],
    };

    renderWithProviders(<ResultsReport result={infraErrorResult} {...mockHandlers} />);

    expect(screen.getByText('Infrastructure Runtime Issue')).toBeDefined();
    expect(screen.getByText('NOT EXECUTED')).toBeDefined();

    // Click to expand collapsible task panel
    const taskHeader = screen.getByText(/Execute Python Sandbox/i);
    fireEvent.click(taskHeader);

    expect(screen.getByText(/Execution halted: Runtime unavailable on server/i)).toBeDefined();
  });

  it('4. Handles MCQ-only assessment gracefully without broken practical layout', () => {
    const mcqOnlyResult: V2SessionResult = {
      sessionId: 'sess-mcq',
      mode: 'practice',
      domainId: 'cybersecurity',
      role: 'Cybersecurity Analyst',
      technicalScore: 80,
      knowledgeScore: 80,
      practicalScore: 80,
      completedAt: '2026-10-18T13:00:00.000Z',
      skillScores: {
        'Network Security': {
          skillName: 'Network Security',
          category: 'Security',
          score: 80,
          level: 4,
          levelLabel: 'Advanced',
          evidenceCount: 3,
          confidence: 'medium',
          knowledgeScore: 80,
          practicalScore: 0,
        },
      },
      categoryScores: [],
      strengths: ['Port scanning analysis'],
      improvements: [],
      answersSummary: [
        {
          questionId: 'q-sec',
          question: 'What is a SYN flood?',
          skillName: 'Network Security',
          selectedOption: 0,
          correctOption: 0,
          isCorrect: true,
          explanation: 'Exhausts TCP connection queues.',
        },
      ],
      practicalSummary: [],
    };

    renderWithProviders(<ResultsReport result={mcqOnlyResult} {...mockHandlers} />);

    expect(screen.getByText('Practice Session Completed')).toBeDefined();
    expect(screen.getByText('Q1: What is a SYN flood?')).toBeDefined();
  });

  it('5. Question details are collapsed by default and expand on click', () => {
    const resultWithQuestions: V2SessionResult = {
      sessionId: 'sess-toggle',
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      technicalScore: 70,
      knowledgeScore: 70,
      practicalScore: 0,
      completedAt: '2026-10-18T14:00:00.000Z',
      skillScores: {},
      categoryScores: [],
      strengths: [],
      improvements: [],
      answersSummary: [
        {
          questionId: 'q-collapsible',
          question: 'What is Virtual DOM?',
          skillName: 'React',
          selectedOption: 0,
          correctOption: 0,
          isCorrect: true,
          explanation: 'Lightweight in-memory representation of real DOM.',
        },
      ],
      practicalSummary: [],
    };

    renderWithProviders(<ResultsReport result={resultWithQuestions} {...mockHandlers} />);

    // Explanation should be hidden initially
    expect(screen.queryByText('Lightweight in-memory representation of real DOM.')).toBeNull();

    // Click to expand
    const trigger = screen.getByText('Q1: What is Virtual DOM?');
    fireEvent.click(trigger);

    // Now explanation is visible
    expect(screen.getByText(/Lightweight in-memory representation of real DOM./)).toBeDefined();
  });

  it('6. Action buttons trigger respective callbacks', () => {
    const sampleResult: V2SessionResult = {
      sessionId: 'sess-actions',
      mode: 'secure',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      technicalScore: 75,
      knowledgeScore: 80,
      practicalScore: 70,
      completedAt: '2026-10-18T15:00:00.000Z',
      skillScores: {},
      categoryScores: [],
      strengths: [],
      improvements: [],
      answersSummary: [],
      practicalSummary: [],
    };

    renderWithProviders(<ResultsReport result={sampleResult} {...mockHandlers} />);

    const retakeBtn = screen.getByText('Retake Assessment');
    fireEvent.click(retakeBtn);
    expect(mockHandlers.onRetake).toHaveBeenCalled();

    const gapBtn = screen.getByText('Skill Gap Analysis');
    fireEvent.click(gapBtn);
    expect(mockHandlers.onNavigateSkillGap).toHaveBeenCalled();

    const roadmapBtn = screen.getByText('View My Roadmap');
    fireEvent.click(roadmapBtn);
    expect(mockHandlers.onNavigateRoadmap).toHaveBeenCalled();
  });
});
