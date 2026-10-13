export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeAcademicYear(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace('–', '-');
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null;
  const [start, end] = normalized.split('-').map(Number);
  return end === (start + 1) % 100 ? normalized : null;
}

export function getDateInTimeZone(date = new Date(), timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
