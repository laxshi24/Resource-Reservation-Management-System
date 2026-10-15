import { notFound } from "next/navigation";
import { ApiClientError } from "../../lib/api-client";
import { reservationsApi } from "./api";

/** Loads a reservation for a page, rendering the 404 page when it does not exist. */
export async function loadReservationOrNotFound(id: string) {
  try {
    return (await reservationsApi.get(id)).data;
  } catch (error) {
    if (error instanceof ApiClientError && error.isNotFound) notFound();
    throw error;
  }
}
