import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

// High-performance tabular display with 44px rows, sticky headers, sorting, row click, optional selection, and pagination.
export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string);
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  // Selection
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No data available.',
  onRowClick,
  selectedIds,
  onSelectRow,
  onSelectAll,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  className = '',
}: DataTableProps<T>): React.ReactElement {
  const getRowId = (row: T): string => {
    if (typeof keyField === 'function') return keyField(row);
    return String(row[keyField] ?? '');
  };

  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const isAllSelected =
    data.length > 0 && selectedIds && data.every((row) => selectedIds.includes(getRowId(row)));

  return (
    <div className={`bg-white border border-[#E5E7EB] rounded-[8px] flex flex-col overflow-hidden ${className}`}>
      {/* Error state */}
      {error && !loading && (
        <div className="p-6 text-center flex flex-col items-center justify-center">
          <AlertCircle size={24} className="text-[#DC2626] mb-2" />
          <p className="text-[14px] text-[#DC2626] font-medium">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main Table */}
      {!error && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            {/* Table Header */}
            <thead className="bg-[#FAFAFA] border-b border-[#E5E7EB] sticky top-0 z-10 select-none">
              <tr className="h-[44px]">
                {onSelectAll && (
                  <th className="w-[44px] px-4 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(isAllSelected)}
                      onChange={onSelectAll}
                      aria-label="Select all rows"
                      className="rounded-[4px] border-[#D1D5DB] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`px-4 font-semibold text-[#111827] text-[13px] ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.sortable ? 'cursor-pointer hover:bg-[#F3F4F6] transition-colors' : ''}`}
                      onClick={() => col.sortable && onSort && onSort(col.key)}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'right' ? 'justify-end' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {col.sortable && isSorted && (
                          <span className="text-[#4F46E5]">
                            {sortDirection === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="h-[44px]">
                    {onSelectAll && (
                      <td className="px-4 text-center">
                        <Skeleton className="w-4 h-4 mx-auto" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onSelectAll ? 1 : 0)}>
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                data.map((row, index) => {
                  const rowId = getRowId(row);
                  const isSelected = selectedIds?.includes(rowId);
                  return (
                    <tr
                      key={rowId || index}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`h-[44px] transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F9FAFB]'}`}
                    >
                      {onSelectRow && (
                        <td
                          className="w-[44px] px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(isSelected)}
                            onChange={() => onSelectRow(rowId)}
                            aria-label={`Select row ${rowId}`}
                            className="rounded-[4px] border-[#D1D5DB] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 text-[#111827] truncate ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(row, index) : String(row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {onPageChange && total > 0 && !loading && !error && (
        <div className="bg-[#FAFAFA] border-t border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between text-[13px] text-[#6B7280]">
          <div>
            Showing <span className="font-medium text-[#111827]">{startItem}</span> to{' '}
            <span className="font-medium text-[#111827]">{endItem}</span> of{' '}
            <span className="font-medium text-[#111827]">{total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
              className="p-1 rounded-[6px] border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-[12px] font-medium text-[#111827]">
              Page {page} of {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              className="p-1 rounded-[6px] border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
