/**
 * The JSON contract between the backend API and the frontend.
 * Dates travel as ISO-8601 strings in UTC (e.g. "2026-10-15T09:00:00.000Z").
 */
import type { ErrorCode, Portal, ReservationStatus, UserRole } from "./constants";

// ---------- Response envelopes ----------

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ValidationIssue {
  /** Dot-separated path of the invalid field, e.g. "capacity". */
  path: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationIssue[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ---------- Auth & users ----------

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface SessionDto {
  user: UserDto;
  portal: Portal;
  expiresAt: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserListItemDto extends UserDto {
  reservationCount: number;
}

// ---------- Health ----------

export interface HealthDto {
  status: "ok" | "degraded";
  database: "up" | "down";
  timestamp: string;
  uptimeSeconds: number;
}

// ---------- Resource categories ----------

export interface CategorySummaryDto {
  id: string;
  name: string;
  slug: string;
}

export interface ResourceCategoryDto extends CategorySummaryDto {
  description: string | null;
  resourceCount: number;
}

// ---------- Resources ----------

export interface ResourceDto {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
  category: CategorySummaryDto;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetailDto extends ResourceDto {
  stats: {
    totalReservations: number;
    upcomingConfirmed: number;
  };
  upcomingReservations: ReservationDto[];
}

export interface CreateResourceRequest {
  name: string;
  categoryId: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}

export type UpdateResourceRequest = Partial<CreateResourceRequest>;

// ---------- Reservations ----------

export interface ReservationResourceDto {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  category: CategorySummaryDto;
}

export interface ReservationDto {
  id: string;
  resourceId: string;
  /** Account that made the booking (null for bookings created before accounts existed). */
  userId: string | null;
  resource: ReservationResourceDto;
  bookedBy: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationRequest {
  resourceId: string;
  /** Admins may book on behalf of someone; ignored for regular users (their own name is used). */
  bookedBy?: string;
  purpose?: string | null;
  /** ISO-8601 instant with an explicit offset or "Z". */
  startTime: string;
  /** ISO-8601 instant with an explicit offset or "Z". Exclusive. */
  endTime: string;
}

export interface UpdateReservationRequest {
  bookedBy?: string;
  purpose?: string | null;
}

export interface CancelReservationRequest {
  reason?: string | null;
}

// ---------- Availability ----------

export type AvailabilityState = "AVAILABLE" | "OCCUPIED" | "INACTIVE";

export interface AvailabilityConflictDto {
  id: string;
  /** Hidden ("Reserved") for other people's bookings on the user website. */
  bookedBy: string;
  /** True when the current user made this booking. */
  isMine: boolean;
  startTime: string;
  endTime: string;
}

export interface AvailabilityItemDto {
  resource: ResourceDto;
  state: AvailabilityState;
  conflicts: AvailabilityConflictDto[];
}

export interface AvailabilityDto {
  startTime: string;
  endTime: string;
  summary: {
    total: number;
    available: number;
    occupied: number;
    inactive: number;
  };
  items: AvailabilityItemDto[];
}

// ---------- Dashboard ----------

export interface DashboardDto {
  date: string;
  timeZone: string;
  totals: {
    activeResources: number;
    inactiveResources: number;
    reservationsOnDate: number;
    upcomingConfirmed: number;
    cancelledTotal: number;
    /** Active resources with no confirmed booking right now. */
    availableNow: number;
    totalUsers: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    name: string;
    activeResources: number;
  }>;
  todaysReservations: ReservationDto[];
  upcomingReservations: ReservationDto[];
  recentReservations: ReservationDto[];
}

// ---------- User website dashboard ----------

export interface MyDashboardDto {
  date: string;
  timeZone: string;
  totals: {
    activeResources: number;
    availableNow: number;
    myReservationsOnDate: number;
    myUpcoming: number;
  };
  myReservationsOnDate: ReservationDto[];
  myUpcoming: ReservationDto[];
}
