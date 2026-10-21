import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourcesPage } from '../pages/student/ResourcesPage';
import { apiClient } from '../services/apiClient';
import type { LearningResource } from '../components/resources/types';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../context/StudentContext', () => ({
  useStudent: () => ({
    targetRole: 'Full-Stack Developer',
    targetDomain: 'dom-frontend',
    skillGaps: [{ skillName: 'React', priority: 'High' }],
  }),
}));

const mockResources: LearningResource[] = [
  {
    id: 'res-vid-1',
    slug: 'react-19-crash-course',
    domain: 'dom-frontend',
    skillTags: ['React', 'TypeScript', 'Frontend'],
    title: 'React 19 & TypeScript Masterclass',
    provider: 'freeCodeCamp.org',
    type: 'video',
    resourceType: 'video',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    isFree: true,
    level: 'Intermediate',
    duration: '2 hours 15 mins',
    durationMinutes: 135,
    language: 'English',
    description: 'Master modern React 19 hooks and TypeScript component design.',
    youtubeVideoId: 'bMknfKXIFA8',
    channelName: 'freeCodeCamp.org',
    thumbnailUrl: 'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg',
    isBookmarked: false,
    progressStatus: 'not_started',
    percentComplete: 0,
    lastPositionSeconds: 0,
    recommendationReason: 'Recommended because you have a gap in React',
  },
  {
    id: 'res-doc-1',
    slug: 'react-official-docs',
    domain: 'dom-frontend',
    skillTags: ['React', 'JavaScript'],
    title: 'React Official Documentation',
    provider: 'React Core Team',
    type: 'documentation',
    resourceType: 'documentation',
    source: 'web',
    url: 'https://react.dev',
    isFree: true,
    level: 'Beginner',
    duration: '10 hours',
    durationMinutes: 600,
    language: 'English',
    description: 'Official interactive handbook from the React team.',
    learningObjectives: ['Understand declarative UI', 'Master hooks'],
    prerequisites: ['HTML', 'JavaScript'],
    isBookmarked: true,
    progressStatus: 'completed',
    percentComplete: 100,
  },
];

describe('ResourcesPage Client Vitest Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      success: true,
      data: mockResources,
      pagination: {
        page: 1,
        pageSize: 12,
        totalCount: 2,
        totalPages: 1,
        hasMore: false,
      },
    });
    (apiClient.post as any).mockResolvedValue({
      success: true,
      data: { status: 'completed' },
      message: 'Progress updated',
    });
  });

  it('1. Renders page header, stat cards, and initial resource cards', async () => {
    render(<ResourcesPage />);

    expect(screen.getByText('Learning Library')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('React 19 & TypeScript Masterclass')).toBeInTheDocument();
      expect(screen.getByText('React Official Documentation')).toBeInTheDocument();
    });

    // Verify channel and duration badge
    expect(screen.getByText('freeCodeCamp.org')).toBeInTheDocument();
    expect(screen.getByText('2 hours 15 mins')).toBeInTheDocument();
  });

  it('2. Format filter buttons switch active filter and trigger API call', async () => {
    render(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('All Formats')).toBeInTheDocument();
    });

    const videosTab = screen.getByRole('button', { name: 'Videos' });
    fireEvent.click(videosTab);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('format=video')
      );
    });
  });

  it('3. Opens VideoPlayerModal when Watch Video button is clicked', async () => {
    render(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('Watch Video')).toBeInTheDocument();
    });

    const watchButton = screen.getByText('Watch Video');
    fireEvent.click(watchButton);

    await waitFor(() => {
      expect(screen.getByText('Mark Completed')).toBeInTheDocument();
      expect(screen.getByText('Open on YouTube')).toBeInTheDocument();
    });
  });

  it('4. Marking video as completed triggers progress update API', async () => {
    render(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('Watch Video')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Watch Video'));

    await waitFor(() => {
      expect(screen.getByText('Mark Completed')).toBeInTheDocument();
    });

    const markButton = screen.getByText('Mark Completed');
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/resources/res-vid-1/progress',
        expect.objectContaining({ status: 'completed', percentComplete: 100 })
      );
    });
  });

  it('5. Opens ResourceDetailModal when View Details button is clicked on documentation', async () => {
    render(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Details'));

    await waitFor(() => {
      expect(screen.getByText('Course Overview')).toBeInTheDocument();
      expect(screen.getByText('Open Learning Portal')).toBeInTheDocument();
    });
  });
});
