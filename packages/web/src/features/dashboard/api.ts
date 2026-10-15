import type { DashboardDto, MyDashboardDto } from "@rrms/shared";
import { apiRequest } from "../../lib/api-client";

export const dashboardApi = {
  /** Organisation-wide dashboard (admin website). */
  get: (params: { date?: string; timeZone: string }) =>
    apiRequest<DashboardDto>("/api/dashboard", { query: { ...params } }),

  /** The logged-in user's own dashboard (user website). */
  mine: (params: { date?: string; timeZone: string }) =>
    apiRequest<MyDashboardDto>("/api/me/dashboard", { query: { ...params } }),
};
