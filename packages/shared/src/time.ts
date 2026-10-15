/**
 * Timezone helpers.
 *
 * Rule of the system: the database stores unambiguous instants (TIMESTAMPTZ, UTC),
 * the API exchanges ISO-8601 strings with an explicit offset, and the UI shows and
 * accepts wall-clock times in one configured IANA timezone (NEXT_PUBLIC_APP_TIMEZONE).
 * These helpers convert between the two representations without relying on the
 * timezone of the machine that happens to run the code.
 */
import { TZDate } from "@date-fns/tz";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidDateString(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Converts a wall-clock value such as "2026-10-15T09:30" (the format of an
 * <input type="datetime-local">) interpreted in `timeZone` into a UTC ISO string.
 * Returns null when the input is malformed.
 */
export function zonedLocalToUtcIso(localDateTime: string, timeZone: string): string | null {
  const match = LOCAL_DATE_TIME_RE.exec(localDateTime);
  if (!match || !isValidDateString(localDateTime.slice(0, 10))) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  if (h > 23 || mi > 59) return null;
  const zoned = new TZDate(y, mo - 1, d, h, mi, 0, timeZone);
  if (Number.isNaN(zoned.getTime())) return null;
  return new Date(zoned.getTime()).toISOString();
}

/** Formats an instant as "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone`. */
export function utcToZonedLocalInput(instant: string | Date, timeZone: string): string {
  const zoned = new TZDate(new Date(instant).getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}` +
    `T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`
  );
}

/** Calendar date ("YYYY-MM-DD") of an instant in `timeZone`. */
export function dateInZone(instant: string | Date, timeZone: string): string {
  return utcToZonedLocalInput(instant, timeZone).slice(0, 10);
}

/**
 * The half-open UTC interval [start, end) covering a calendar day in `timeZone`.
 * Correct on daylight-saving transition days (which are 23 or 25 hours long).
 */
export function zonedDayRange(date: string, timeZone: string): { start: Date; end: Date } {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date "${date}", expected YYYY-MM-DD`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const start = new TZDate(y, m - 1, d, 0, 0, 0, timeZone);
  const end = new TZDate(y, m - 1, d + 1, 0, 0, 0, timeZone);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}
