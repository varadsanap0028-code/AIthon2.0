import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell } from '../components/admin/csv';

describe('Admin CSV Formula Injection Protection Suite', () => {
  it('1. Neutralizes equals formula injection by prefixing with a single quote', () => {
    const raw = '=cmd|"/C calc"!A0';
    const sanitized = sanitizeCsvCell(raw);
    expect(sanitized).toBe('"\'=cmd|""/C calc""!A0"');
  });

  it('2. Neutralizes plus formula injection', () => {
    const raw = '+12345';
    const sanitized = sanitizeCsvCell(raw);
    expect(sanitized).toBe("\"'+12345\"");
  });

  it('3. Neutralizes minus formula injection', () => {
    const raw = '-2+3';
    const sanitized = sanitizeCsvCell(raw);
    expect(sanitized).toBe("\"'-2+3\"");
  });

  it('4. Neutralizes at symbol formula injection', () => {
    const raw = '@SUM(1,2)';
    const sanitized = sanitizeCsvCell(raw);
    expect(sanitized).toBe("\"'@SUM(1,2)\"");
  });

  it('5. Handles normal safe strings, numbers, and null/undefined gracefully', () => {
    expect(sanitizeCsvCell('Regular Safe Text')).toBe('"Regular Safe Text"');
    expect(sanitizeCsvCell(100)).toBe('"100"');
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
  });

  it('6. Escapes internal double quotes properly', () => {
    const raw = 'Text with "quoted words" inside';
    const sanitized = sanitizeCsvCell(raw);
    expect(sanitized).toBe('"Text with ""quoted words"" inside"');
  });
});
