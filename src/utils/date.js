/**
 * Format a date value to a consistent English short date.
 * Example output: "May 26, 2026"
 *
 * @param {string|Date|null|undefined} val — ISO date string, Date object, or nullish.
 * @param {string} [fallback='-'] — Returned when val is falsy or invalid.
 * @returns {string}
 */
export function formatDate(val, fallback = '-') {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date value to a short date + time.
 * Example output: "May 26, 2026, 06:30 PM"
 *
 * @param {string|Date|null|undefined} val
 * @param {string} [fallback='-']
 * @returns {string}
 */
export function formatDateTime(val, fallback = '-') {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
