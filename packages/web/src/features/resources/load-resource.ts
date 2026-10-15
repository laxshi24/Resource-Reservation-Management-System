import { notFound } from "next/navigation";
import { ApiClientError } from "../../lib/api-client";
import { resourcesApi } from "./api";

/** Loads a resource for a page, rendering the 404 page when it does not exist. */
export async function loadResourceOrNotFound(id: string) {
  try {
    return (await resourcesApi.get(id)).data;
  } catch (error) {
    if (error instanceof ApiClientError && error.isNotFound) notFound();
    throw error;
  }
}
