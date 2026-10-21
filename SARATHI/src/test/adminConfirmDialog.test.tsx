import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';

describe('Admin ConfirmDialog Component Suite', () => {
  it('1. Renders title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Suspend User Account"
        message="Are you sure you want to suspend this user?"
      />
    );

    expect(screen.getByText('Suspend User Account')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to suspend this user?')).toBeInTheDocument();
  });

  it('2. Does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Suspend User"
        message="Are you sure?"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('3. Requires reason when reasonRequired is true and blocks submission if empty', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
        title="Reject Recruiter"
        message="Specify rejection reasons"
        reasonRequired={true}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('A reason is required to proceed with this action.')
    ).toBeInTheDocument();
  });

  it('4. Successfully submits with provided reason when reasonRequired is true', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
        title="Reject Recruiter"
        message="Specify rejection reasons"
        reasonRequired={true}
      />
    );

    const textarea = screen.getByPlaceholderText('Please enter a mandatory reason...');
    fireEvent.change(textarea, { target: { value: 'Incomplete business license documents' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledWith('Incomplete business license documents');
  });

  it('5. Triggers onClose when Cancel is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn()}
        title="Cancel Test"
        message="Cancel message"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
