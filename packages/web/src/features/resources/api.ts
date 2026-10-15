import type {
  CreateResourceRequest,
  Paginated,
  ResourceCategoryDto,
  ResourceDetailDto,
  ResourceDto,
  UpdateResourceRequest,
} from "@rrms/shared";
import { apiRequest } from "../../lib/api-client";

export type ResourceStatusFilter = "active" | "inactive" | "all";

export interface ListResourcesParams {
  search?: string;
  categoryId?: string;
  status?: ResourceStatusFilter;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "capacity";
  sortOrder?: "asc" | "desc";
}

export const resourcesApi = {
  list: (params: ListResourcesParams = {}) =>
    apiRequest<Paginated<ResourceDto>>("/api/resources", { query: { ...params } }),

  get: (id: string) => apiRequest<ResourceDetailDto>(`/api/resources/${encodeURIComponent(id)}`),

  create: (body: CreateResourceRequest) => apiRequest<ResourceDto>("/api/resources", { method: "POST", body }),

  update: (id: string, body: UpdateResourceRequest) =>
    apiRequest<ResourceDto>(`/api/resources/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  remove: (id: string) => apiRequest<void>(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listCategories: () => apiRequest<ResourceCategoryDto[]>("/api/resource-categories"),
};
