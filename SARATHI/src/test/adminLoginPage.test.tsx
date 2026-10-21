import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminLoginPage } from '../pages/public/AdminLoginPage';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminLoginPage Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Resets cached session on mount and presents credential inputs', () => {
    const mockLogout = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'admin-1', email: 'admin@sarathi.dev', role: 'platform_admin', fullName: 'Admin' } as any,
      isAuthenticated: true,
      isLoading: false,
      isDemo: true,
      appMode: 'demo',
      token: 'mock-token',
      login: vi.fn(),
      signup: vi.fn(),
      updateProfile: vi.fn(),
      logout: mockLogout,
      switchDemoRole: vi.fn(),
      loginAsNewStudent: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    // Verify logout is called to prevent bypass
    expect(mockLogout).toHaveBeenCalled();
    // Verify credential inputs are present
    expect(screen.getByLabelText(/Administrator Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Password/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('2. Renders secure admin login form without automatic sign-in', () => {
    const mockSwitchDemoRole = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: true,
      appMode: 'demo',
      token: null,
      login: vi.fn(),
      signup: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
      switchDemoRole: mockSwitchDemoRole,
      loginAsNewStudent: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /SARATHI Platform Admin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Authenticate Administrator/i })).toBeInTheDocument();
    expect(mockSwitchDemoRole).not.toHaveBeenCalled();
  });

  it('3. Successful manual admin authentication redirects to /admin', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: 'usr-1',
      email: 'admin@sarathi.dev',
      role: 'platform_admin',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: true,
      appMode: 'production',
      token: null,
      login: mockLogin,
      signup: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
      switchDemoRole: vi.fn(),
      loginAsNewStudent: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Administrator Email/i), { target: { value: 'admin@sarathi.dev' } });
    fireEvent.change(screen.getByLabelText(/Administrator Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate Administrator/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@sarathi.dev', 'password123', 'platform_admin', true);
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('4. Displays error alert when admin credentials are invalid', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid email or password'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: true,
      appMode: 'production',
      token: null,
      login: mockLogin,
      signup: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
      switchDemoRole: vi.fn(),
      loginAsNewStudent: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Administrator Email/i), { target: { value: 'admin@sarathi.dev' } });
    fireEvent.change(screen.getByLabelText(/Administrator Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate Administrator/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    });
  });

  it('5. Rejects login if authenticated user is not platform_admin', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: 'usr-student-1',
      email: 'student@sarathi.ai',
      role: 'student',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: true,
      appMode: 'production',
      token: null,
      login: mockLogin,
      signup: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
      switchDemoRole: vi.fn(),
      loginAsNewStudent: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Administrator Email/i), { target: { value: 'student@sarathi.ai' } });
    fireEvent.change(screen.getByLabelText(/Administrator Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate Administrator/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Access Denied/i);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
