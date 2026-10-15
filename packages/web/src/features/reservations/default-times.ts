import { utcToZonedLocalInput, zonedLocalToUtcIso } from "@rrms/shared";
import { APP_TIME_ZONE } from "../../lib/format-date";

const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Returns `value` if it is a valid datetime-local string, else undefined. */
export function validLocalDateTime(value: string | undefined): string | undefined {
  return value && LOCAL_RE.test(value) && zonedLocalToUtcIso(value, APP_TIME_ZONE) ? value : undefined;
}

/** Default booking slot: the next full hour, lasting one hour (app timezone). */
export function defaultSlot(now = new Date()): { start: string; end: string } {
  // Round down to the hour on the *local* clock (zones like +05:30 are not hour-aligned with UTC).
  const currentHourLocal = `${utcToZonedLocalInput(now, APP_TIME_ZONE).slice(0, 13)}:00`;
  const currentHour = new Date(zonedLocalToUtcIso(currentHourLocal, APP_TIME_ZONE)!);
  const start = new Date(currentHour.getTime() + 60 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start: utcToZonedLocalInput(start, APP_TIME_ZONE), end: utcToZonedLocalInput(end, APP_TIME_ZONE) };
}

/** "Now" as a datetime-local string, used as the `min` of the inputs. */
export function nowLocalInput(): string {
  return utcToZonedLocalInput(new Date(), APP_TIME_ZONE);
}
