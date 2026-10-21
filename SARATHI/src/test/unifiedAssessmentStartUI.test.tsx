import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { UnifiedAssessmentStart } from '../components/assessment/UnifiedAssessmentStart';
import type { AssessmentMode } from '../types/assessmentV2';

const StartWrapper: React.FC<{ initialMode?: AssessmentMode }> = ({ initialMode = 'practice' }) => {
  const [mode, setMode] = useState<AssessmentMode>(initialMode);
  return (
    <UnifiedAssessmentStart
      selectedMode={mode}
      onSelectMode={setMode}
      domainTitle="Web Development"
      roleTitle="Full-Stack Developer"
      onContinue={vi.fn()}
    />
  );
};

describe('UnifiedAssessmentStart UI Improvements Suite', () => {
  it('1. Does NOT render "View Previous Result" anywhere on the assessment start page', () => {
    render(<StartWrapper />);
    expect(screen.queryByRole('button', { name: /View Previous Result/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/View Previous Result/i)).not.toBeInTheDocument();
  });

  it('2. Renders Practice & Diagnostic Sandbox policy card with distinct, accessible selection styling', () => {
    render(<StartWrapper initialMode="practice" />);

    // Check heading and policy labels
    expect(screen.getByRole('heading', { name: 'Practice & Diagnostic Sandbox' })).toBeInTheDocument();
    expect(screen.getByText('Practice Policy')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic & Low-Stakes')).toBeInTheDocument();

    // Verify radio accessibility
    const practiceRadio = screen.getByRole('radio', { name: /Practice & Diagnostic Sandbox/i });
    expect(practiceRadio).toBeInTheDocument();
    expect(practiceRadio).toHaveAttribute('aria-checked', 'true');
    expect(practiceRadio.className).toMatch(/border-\[#087BFA\]|border-blue/);
    expect(practiceRadio.className).toMatch(/bg-\[#EFF6FF\]|bg-blue-50/);

    // Selection indicator text
    expect(screen.getByText(/● Selected/i)).toBeInTheDocument();
  });

  it('3. Renders Secure Assessment policy card with distinct visual styling and selection states', () => {
    render(<StartWrapper initialMode="practice" />);

    // Secure card should initially be unselected
    const secureRadio = screen.getByRole('radio', { name: /Secure Assessment/i });
    expect(secureRadio).toBeInTheDocument();
    expect(secureRadio).toHaveAttribute('aria-checked', 'false');
    expect(secureRadio.className).toMatch(/border-\[#E0E7F2\]|border-slate/);

    // Click Secure card to switch
    fireEvent.click(secureRadio);

    // Now Secure card should be selected with indigo border and bg
    expect(secureRadio).toHaveAttribute('aria-checked', 'true');
    expect(secureRadio.className).toMatch(/border-\[#4F46E5\]|border-indigo/);
    expect(secureRadio.className).toMatch(/bg-\[#EEF2FF\]|bg-indigo-50/);
    expect(practiceRadioState(false)).toBeTruthy();
  });

  it('4. Correctly displays the complete Privacy Commitment notice with high contrast', () => {
    render(<StartWrapper />);

    // Full privacy notice verification
    const privacyNotice = screen.getByText(/No video or audio is ever recorded, transmitted, or stored on remote servers/i);
    expect(privacyNotice).toBeInTheDocument();
    expect(screen.getByText(/Privacy Commitment:/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /No video or audio is ever recorded, transmitted, or stored on remote servers\. For secure assessments, camera readiness is verified locally on your device to confirm workstation setup\./i
      )
    ).toBeInTheDocument();
  });

  it('5. Dynamically updates Selected Track text when toggling between Practice and Secure', () => {
    render(<StartWrapper initialMode="practice" />);

    // Initially Practice
    expect(screen.getByText('Selected Track:')).toBeInTheDocument();
    expect(screen.getByText('Practice & Diagnostic Sandbox', { selector: 'strong' })).toBeInTheDocument();

    // Switch to Secure Assessment
    const secureRadio = screen.getByRole('radio', { name: /Secure Assessment/i });
    fireEvent.click(secureRadio);

    // Now Selected Track should be Secure Assessment
    expect(screen.getByText('Secure Assessment', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proceed to Verification & Start/i })).toBeInTheDocument();

    // Switch back to Practice
    const practiceRadio = screen.getByRole('radio', { name: /Practice & Diagnostic Sandbox/i });
    fireEvent.click(practiceRadio);

    expect(screen.getByText('Practice & Diagnostic Sandbox', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Practice Assessment/i })).toBeInTheDocument();
  });

  it('6. Supports keyboard navigation on policy cards', () => {
    const onSelectMode = vi.fn();
    render(
      <UnifiedAssessmentStart
        selectedMode="practice"
        onSelectMode={onSelectMode}
        domainTitle="Web Development"
        roleTitle="Full-Stack Developer"
        onContinue={vi.fn()}
      />
    );

    const secureRadio = screen.getByRole('radio', { name: /Secure Assessment/i });
    fireEvent.keyDown(secureRadio, { key: 'Enter', code: 'Enter' });
    expect(onSelectMode).toHaveBeenCalledWith('secure');

    fireEvent.keyDown(secureRadio, { key: ' ', code: 'Space' });
    expect(onSelectMode).toHaveBeenCalledWith('secure');
  });
});

function practiceRadioState(selected: boolean) {
  const radio = screen.getByRole('radio', { name: /Practice & Diagnostic Sandbox/i });
  return radio.getAttribute('aria-checked') === (selected ? 'true' : 'false');
}
