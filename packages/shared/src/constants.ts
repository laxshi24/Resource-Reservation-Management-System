/**
 * Business constants shared by the frontend (form validation, labels) and the
 * backend (Zod schemas, business rules). Keeping them in one place guarantees
 * that both sides enforce exactly the same limits.
 */

export const RESERVATION_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that occupy a resource and therefore block other bookings. */
export const BLOCKING_RESERVATION_STATUSES: readonly ReservationStatus[] = ["CONFIRMED"];

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** The two websites. Each has its own login session (and cookie). */
export const PORTALS = ["user", "admin"] as const;
export type Portal = (typeof PORTALS)[number];

/** Header the websites send so the API knows which site (and session cookie) a request belongs to. */
export const PORTAL_HEADER = "x-portal";

export const SESSION_COOKIE_NAMES: Record<Portal, string> = {
  user: "rrms_session",
  admin: "rrms_admin_session",
};

export const FIELD_LIMITS = {
  resourceName: { min: 2, max: 100 },
  resourceDescription: { max: 1000 },
  resourceLocation: { max: 150 },
  resourceCapacity: { min: 1, max: 1000 },
  bookedBy: { min: 2, max: 100 },
  purpose: { max: 500 },
  cancellationReason: { max: 300 },
  search: { max: 100 },
  userName: { min: 2, max: 100 },
  email: { max: 254 },
  password: { min: 8, max: 128 },
} as const;

export const RESERVATION_RULES = {
  /** Longest single reservation allowed. */
  maxDurationMinutes: 7 * 24 * 60,
  /** Shortest single reservation allowed. */
  minDurationMinutes: 15,
  /** Small tolerance so a booking "starting now" is not rejected because of clock skew. */
  pastStartToleranceMinutes: 5,
} as const;

export const PAGINATION = {
  defaultPageSize: 10,
  maxPageSize: 100,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
  RESOURCE_NAME_TAKEN: "RESOURCE_NAME_TAKEN",
  RESOURCE_INACTIVE: "RESOURCE_INACTIVE",
  RESOURCE_HAS_RESERVATIONS: "RESOURCE_HAS_RESERVATIONS",
  RESERVATION_CONFLICT: "RESERVATION_CONFLICT",
  RESERVATION_ALREADY_CANCELLED: "RESERVATION_ALREADY_CANCELLED",
  RESERVATION_ALREADY_ENDED: "RESERVATION_ALREADY_ENDED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
