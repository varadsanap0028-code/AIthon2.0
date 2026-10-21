import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectFormModal } from '../pages/student/ProjectFormModal';
import { apiClient } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('Automated GitHub Project Information Extraction (Feature Enhancement)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a minimal submission UI with only GitHub URL and Analyze Repository button initially', () => {
    render(
      <ProjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        editingProject={null}
        onSave={vi.fn()}
      />
    );

    // Initial minimal interface check
    expect(screen.getByText('Submit New Project Evidence')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://github.com/username/project-repo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Repository/i })).toBeInTheDocument();

    // Verify original six manual fields are NOT displayed initially
    expect(screen.queryByLabelText(/Project Title/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Demonstrated Skills/i)).not.toBeInTheDocument();

    // Submit button should be disabled until analysis completes
    const submitBtn = screen.getByRole('button', { name: /Submit Project/i });
    expect(submitBtn).toBeDisabled();
  });

  it('validates invalid GitHub URLs and blocks submission', async () => {
    render(
      <ProjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        editingProject={null}
        onSave={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('https://github.com/username/project-repo');
    fireEvent.change(input, { target: { value: 'https://gitlab.com/invalid/repo' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Repository/i });
    fireEvent.click(analyzeBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Invalid repository URL/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('automatically extracts repository information and renders project preview', async () => {
    const mockExtractedData = {
      title: 'Distributed Event Queue',
      description: 'High-throughput event stream processor with Redis and TypeScript.',
      repositoryUrl: 'https://github.com/alexmorgan/distributed-event-queue',
      technologies: ['TypeScript', 'Redis', 'Node.js', 'Docker'],
      skillsDemonstrated: ['Distributed Systems', 'Message Queuing', 'RESTful API Design'],
      primaryLanguage: 'TypeScript',
      architecture: 'Microservice Event Pipeline',
      liveDemoUrl: 'https://event-queue.vercel.app',
      screenshotUrl: 'https://raw.githubusercontent.com/alexmorgan/distributed-event-queue/main/docs/preview.png',
      stars: 42,
      forks: 8,
      keyFeatures: ['Sub-millisecond latency', 'Dead-letter queue recovery'],
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: mockExtractedData,
    } as any);

    const handleSave = vi.fn();
    render(
      <ProjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        editingProject={null}
        onSave={handleSave}
      />
    );

    const input = screen.getByPlaceholderText('https://github.com/username/project-repo');
    fireEvent.change(input, { target: { value: 'https://github.com/alexmorgan/distributed-event-queue' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Repository/i });
    fireEvent.click(analyzeBtn);

    // Verify auto-extracted preview is rendered
    expect(await screen.findByText('Distributed Event Queue')).toBeInTheDocument();
    expect(screen.getByText('Evidence Extracted Automatically')).toBeInTheDocument();
    expect(screen.getByText(/High-throughput event stream processor/i)).toBeInTheDocument();
    expect(screen.getByText('Distributed Systems')).toBeInTheDocument();
    expect(screen.getByText('Microservice Event Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Live Demo Detected')).toBeInTheDocument();

    // Submit Project is now enabled
    const submitBtn = screen.getByRole('button', { name: /Submit Project/i });
    expect(submitBtn).toBeEnabled();

    // Click submit and verify onSave receives all extracted data without manual entry
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith({
      title: 'Distributed Event Queue',
      description: 'High-throughput event stream processor with Redis and TypeScript.',
      technologies: ['TypeScript', 'Redis', 'Node.js', 'Docker'],
      repositoryUrl: 'https://github.com/alexmorgan/distributed-event-queue',
      liveDemoUrl: 'https://event-queue.vercel.app',
      screenshotUrl: 'https://raw.githubusercontent.com/alexmorgan/distributed-event-queue/main/docs/preview.png',
      skillsDemonstrated: ['Distributed Systems', 'Message Queuing', 'RESTful API Design'],
    });
  });
});
