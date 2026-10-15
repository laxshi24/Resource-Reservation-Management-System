import { dateInZone } from "@rrms/shared";
import { publicEnv } from "./env";

/**
 * All dates are displayed in the configured application timezone
 * (NEXT_PUBLIC_APP_TIMEZONE), not in the timezone of whichever machine renders
 * the page. A fixed locale keeps server- and client-rendered text identical.
 */
const LOCALE = "en-GB";
const timeZone = publicEnv.timeZone;

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { timeZone, dateStyle: "medium", timeStyle: "short" });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat(LOCALE, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const APP_TIME_ZONE = timeZone;

export function formatDateTime(instant: string | Date): string {
  return dateTimeFormat.format(new Date(instant));
}

export function formatDate(instant: string | Date): string {
  return dateFormat.format(new Date(instant));
}

export function formatTime(instant: string | Date): string {
  return timeFormat.format(new Date(instant));
}

/** "Thu, 15 Oct 2026 · 09:00–10:30", or both full dates when the range spans days. */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  if (dateInZone(start, timeZone) === dateInZone(end, timeZone)) {
    return `${formatDate(start)} · ${formatTime(start)}–${formatTime(end)}`;
  }
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
}

/** Human-readable duration such as "1 h 30 min". */
export function formatDuration(start: string | Date, end: string | Date): string {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days} d`, hours && `${hours} h`, mins && `${mins} min`].filter(Boolean).join(" ") || "0 min";
}

/** Today's date ("YYYY-MM-DD") in the application timezone. */
export function todayInAppZone(): string {
  return dateInZone(new Date(), timeZone);
}
