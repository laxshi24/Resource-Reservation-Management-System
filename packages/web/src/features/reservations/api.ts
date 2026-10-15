import type {
  AvailabilityDto,
  CancelReservationRequest,
  CreateReservationRequest,
  Paginated,
  ReservationDto,
  ReservationStatus,
  UpdateReservationRequest,
} from "@rrms/shared";
import { apiRequest } from "../../lib/api-client";

export interface ListReservationsParams {
  resourceId?: string;
  status?: ReservationStatus | "all";
  /** Only reservations overlapping [from, to) - ISO instants. */
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: "asc" | "desc";
}

export interface AvailabilityParams {
  startTime: string;
  endTime: string;
  categoryId?: string;
}

export const reservationsApi = {
  list: (params: ListReservationsParams = {}) =>
    apiRequest<Paginated<ReservationDto>>("/api/reservations", { query: { ...params } }),

  get: (id: string) => apiRequest<ReservationDto>(`/api/reservations/${encodeURIComponent(id)}`),

  create: (body: CreateReservationRequest) =>
    apiRequest<ReservationDto>("/api/reservations", { method: "POST", body }),

  update: (id: string, body: UpdateReservationRequest) =>
    apiRequest<ReservationDto>(`/api/reservations/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  cancel: (id: string, body: CancelReservationRequest = {}) =>
    apiRequest<ReservationDto>(`/api/reservations/${encodeURIComponent(id)}/cancel`, { method: "POST", body }),

  availability: (params: AvailabilityParams) =>
    apiRequest<AvailabilityDto>("/api/reservations/availability", { query: { ...params } }),
};
