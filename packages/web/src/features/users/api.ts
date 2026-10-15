import type { Paginated, UserListItemDto } from "@rrms/shared";
import { apiRequest } from "../../lib/api-client";

export const usersApi = {
  list: (params: { search?: string; role?: "USER" | "ADMIN" | "all"; page?: number; pageSize?: number } = {}) =>
    apiRequest<Paginated<UserListItemDto>>("/api/users", { query: { ...params } }),
};
