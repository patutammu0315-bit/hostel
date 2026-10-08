/**
 * Date and Timezone Utilities for Hostel Daily Count
 * Configured specifically for Asia/Kolkata (Indian Standard Time, UTC+5:30)
 */

export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Get current date parts in the configured application timezone
 */
export function getCurrentDateInTimezone(tz: string = DEFAULT_TIMEZONE): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  isoDate: string; // YYYY-MM-DD
  formattedDate: string; // DD-MM-YYYY
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const day = parseInt(partMap.day, 10);
  const month = parseInt(partMap.month, 10);
  const year = parseInt(partMap.year, 10);
  const pad = (n: number) => n.toString().padStart(2, '0');

  const isoDate = `${year}-${pad(month)}-${pad(day)}`;
  const formattedDate = `${pad(day)}-${pad(month)}-${year}`;

  return { year, month, day, isoDate, formattedDate };
}

/**
 * Get yesterday's date in the configured application timezone
 */
export function getYesterdayDateInTimezone(tz: string = DEFAULT_TIMEZONE): {
  year: number;
  month: number;
  day: number;
  isoDate: string;
  formattedDate: string;
} {
  const current = getCurrentDateInTimezone(tz);
  // Calculate yesterday in UTC date object representation
  const dateObj = new Date(Date.UTC(current.year, current.month - 1, current.day));
  dateObj.setUTCDate(dateObj.getUTCDate() - 1);

  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const isoDate = `${year}-${pad(month)}-${pad(day)}`;
  const formattedDate = `${pad(day)}-${pad(month)}-${year}`;

  return { year, month, day, isoDate, formattedDate };
}

/**
 * Format a YYYY-MM-DD ISO date string to DD-MM-YYYY for display
 */
export function formatIsoToDisplay(isoDateString: string): string {
  if (!isoDateString) return '';
  const [year, month, day] = isoDateString.split('-');
  if (!year || !month || !day) return isoDateString;
  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
}

/**
 * Format timestamp (ISO or Date) to Indian standard readable time (e.g. 08:30 AM or 08-10-2026 08:30 AM)
 */
export function formatDisplayDateTime(isoDateTime: string, tz: string = DEFAULT_TIMEZONE): string {
  if (!isoDateTime) return '';
  try {
    const d = new Date(isoDateTime);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoDateTime;
  }
}

/**
 * Get Month name and year in English (e.g., "October 2026")
 */
export function getMonthNameAndYear(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
