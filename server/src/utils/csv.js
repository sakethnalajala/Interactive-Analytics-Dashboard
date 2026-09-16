/**
 * Streams rows as RFC-4180 CSV. `columns` = [{ key, label, format? }].
 * Rows may be an array or an async iterable (Mongoose cursor) so large filtered
 * exports keep memory flat.
 */
export async function sendCsv(res, filename, columns, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.write('﻿'); // BOM so Excel opens UTF-8 correctly
  res.write(columns.map((c) => escapeCell(c.label)).join(',') + '\r\n');
  for await (const row of rows) {
    const plain = typeof row.toObject === 'function' ? row.toObject() : row;
    res.write(columns.map((c) => escapeCell(c.format ? c.format(plain[c.key], plain) : plain[c.key])).join(',') + '\r\n');
  }
  res.end();
}

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  // Prevent formula injection when opened in spreadsheet apps
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
