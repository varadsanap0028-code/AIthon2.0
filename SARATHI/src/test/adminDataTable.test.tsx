import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '../components/admin/DataTable';

interface TestItem {
  id: string;
  name: string;
  role: string;
  email: string;
}

const mockColumns: Column<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role', sortable: true },
  { key: 'email', header: 'Email' },
];

const mockData: TestItem[] = [
  { id: '1', name: 'Alice Admin', role: 'platform_admin', email: 'alice@sarathi.dev' },
  { id: '2', name: 'Bob Recruiter', role: 'recruiter', email: 'bob@example.com' },
];

describe('Admin DataTable Component Suite', () => {
  it('1. Renders table headers and row contents correctly', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Recruiter')).toBeInTheDocument();
  });

  it('2. Triggers onSort when sortable header is clicked', () => {
    const onSortMock = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        sortColumn="name"
        sortDirection="asc"
        onSort={onSortMock}
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    expect(onSortMock).toHaveBeenCalledWith('name');
  });

  it('3. Triggers onPageChange when pagination buttons are clicked', () => {
    const onPageChangeMock = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        page={1}
        pageSize={2}
        total={10}
        onPageChange={onPageChangeMock}
      />
    );

    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextBtn);

    expect(onPageChangeMock).toHaveBeenCalledWith(2);
  });

  it('4. Triggers onRowClick when a data row is clicked', () => {
    const onRowClickMock = vi.fn();
    render(<DataTable columns={mockColumns} data={mockData} onRowClick={onRowClickMock} />);

    const rowCell = screen.getByText('Alice Admin');
    fireEvent.click(rowCell);

    expect(onRowClickMock).toHaveBeenCalledWith(mockData[0]);
  });

  it('5. Handles row selection checkboxes and select all', () => {
    const onSelectRowMock = vi.fn();
    const onSelectAllMock = vi.fn();

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        selectedIds={['1']}
        onSelectRow={onSelectRowMock}
        onSelectAll={onSelectAllMock}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' });
    fireEvent.click(selectAllCheckbox);
    expect(onSelectAllMock).toHaveBeenCalled();

    const rowCheckbox = screen.getByRole('checkbox', { name: 'Select row 2' });
    fireEvent.click(rowCheckbox);
    expect(onSelectRowMock).toHaveBeenCalledWith('2');
  });

  it('6. Displays empty message when data is empty', () => {
    render(<DataTable columns={mockColumns} data={[]} emptyMessage="No users found." />);

    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });
});
