import { PAGINATION, type PaginationMeta } from "@rrms/shared";
import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "page must be 1 or greater").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "pageSize must be 1 or greater")
    .max(PAGINATION.maxPageSize, `pageSize must be ${PAGINATION.maxPageSize} or less`)
    .default(PAGINATION.defaultPageSize),
});

export function paginationArgs(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}

/** Converts URLSearchParams into a plain object, dropping empty values. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    if (value.trim() !== "") result[key] = value;
  }
  return result;
}
