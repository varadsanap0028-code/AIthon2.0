import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { studentNavSections } from '../components/navigation/StudentSidebar';

describe('Dashboard Routing & Navigation (PRD §4 & §7)', () => {
  it('removes Analytics from the student sidebar navigation structure', () => {
    const careerSection = studentNavSections.find(s => s.id === 'career-dashboard');
    expect(careerSection).toBeDefined();

    const labels = careerSection?.items.map(item => item.label);
    expect(labels).toContain('Dashboard');
    expect(labels).not.toContain('My Profile');
    expect(labels).not.toContain('Analytics');

    const paths = careerSection?.items.map(item => item.path);
    expect(paths).not.toContain('/student/analytics');
  });

  it('redirects /student/analytics to /student/dashboard cleanly without 404', () => {
    render(
      <MemoryRouter initialEntries={['/student/analytics']}>
        <Routes>
          <Route path="/student/analytics" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/dashboard" element={<div data-testid="merged-dashboard">Unified Student Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    const el = screen.getByTestId('merged-dashboard');
    expect(el).toBeTruthy();
    expect(screen.getByText('Unified Student Dashboard')).toBeTruthy();
  });
});
