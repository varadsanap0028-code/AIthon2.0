// Exports tabular data to CSV while sanitizing cells to neutralize formula injection attacks.

const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralizes Excel / CSV formula injection by prepending an apostrophe (')
 * if a string cell begins with =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) {
    return '""';
  }

  let str = String(cell);

  // If cell starts with formula trigger, prepend single quote
  if (FORMULA_INJECTION_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  str = str.replace(/"/g, '""');

  return `"${str}"`;
}

/**
 * Downloads a generated CSV file in the browser safely.
 *
 * @param filename File name (e.g. 'users_export.csv')
 * @param rows Array of objects or array of arrays
 * @param headers Optional custom header labels
 */
export function downloadCsv(
  filename: string,
  rows: Record<string, any>[] | any[][],
  headers?: string[]
): void {
  if (!rows || rows.length === 0) {
    return;
  }

  let csvContent = '';

  if (Array.isArray(rows[0])) {
    // Array of arrays
    if (headers && headers.length > 0) {
      csvContent += headers.map(sanitizeCsvCell).join(',') + '\r\n';
    }
    for (const row of rows as any[][]) {
      csvContent += row.map(sanitizeCsvCell).join(',') + '\r\n';
    }
  } else {
    // Array of objects
    const objRows = rows as Record<string, any>[];
    const keys = headers || Object.keys(objRows[0]);
    csvContent += keys.map(sanitizeCsvCell).join(',') + '\r\n';

    for (const row of objRows) {
      const line = keys.map((key) => sanitizeCsvCell(row[key])).join(',');
      csvContent += line + '\r\n';
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
