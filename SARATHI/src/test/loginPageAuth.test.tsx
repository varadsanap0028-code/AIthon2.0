import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/public/LoginPage';
import { AuthProvider } from '../context/AuthContext';

describe('Unified Login Page (FR-UI-001..009)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock mode endpoint
    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/auth/mode')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ mode: 'demo', demoAuthEnabled: true }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  const renderLoginPage = async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    // Wait for auth initialization to complete and form to be visible
    return await screen.findByRole('tab', { name: /student/i });
  };

  it('renders the unified login page with portal tabs, Google button, and email/password inputs', async () => {
    await renderLoginPage();

    // Portal tabs
    expect(screen.getByRole('tab', { name: /student/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /recruiter/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /college/i })).toBeDefined();

    // Google Sign-In button
    expect(screen.getByText(/continue with google/i)).toBeDefined();

    // Form inputs
    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByText(/remember me/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in to sarathi/i })).toBeDefined();
  });

  it('validates required fields and displays accessible alert when submitted empty', async () => {
    await renderLoginPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    // Clear credentials
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /sign in to sarathi/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toMatch(/email.*password/i);
  });

  it('toggles password visibility when the show/hide button is clicked', async () => {
    await renderLoginPage();

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/show password/i);
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByLabelText(/hide password/i);
    fireEvent.click(hideBtn);

    expect(passwordInput.type).toBe('password');
  });

  it('allows selecting portal tabs as a cosmetic UI hint', async () => {
    await renderLoginPage();

    const recruiterTab = screen.getByRole('tab', { name: /recruiter/i });
    fireEvent.click(recruiterTab);

    expect(recruiterTab.getAttribute('aria-selected')).toBe('true');

    const collegeTab = screen.getByRole('tab', { name: /college/i });
    fireEvent.click(collegeTab);

    expect(collegeTab.getAttribute('aria-selected')).toBe('true');
  });

  it('toggles the remember me checkbox state', async () => {
    await renderLoginPage();

    const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
    expect(rememberCheckbox.checked).toBe(true);

    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox.checked).toBe(false);

    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox.checked).toBe(true);
  });
});
