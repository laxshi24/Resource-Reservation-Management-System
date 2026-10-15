/** Helpers to read Next.js `searchParams` safely (values may be arrays or missing). */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function getParam(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() ? single.trim() : undefined;
}

export function getEnumParam<T extends string>(params: RawSearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const value = getParam(params, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function getPageParam(params: RawSearchParams): number {
  const page = Number(getParam(params, "page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getUuidParam(params: RawSearchParams, key: string): string | undefined {
  const value = getParam(params, key);
  return value && UUID_RE.test(value) ? value : undefined;
}
