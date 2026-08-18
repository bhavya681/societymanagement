export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) {
    return (columns ?? []).join(",");
  }
  const headers = columns ?? Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}
