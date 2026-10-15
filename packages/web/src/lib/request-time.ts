import "server-only";

/**
 * The current time for a server-rendered request.
 *
 * Async Server Components render exactly once per request, so reading the
 * clock here is deterministic for that response (unlike in Client Components,
 * which may re-render). Used to decide, for example, whether a reservation has
 * already ended and can no longer be cancelled.
 */
export function requestTime(): number {
  return Date.now();
}
