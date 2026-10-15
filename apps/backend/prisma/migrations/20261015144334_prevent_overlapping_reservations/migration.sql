-- ---------------------------------------------------------------------------
-- Double-booking prevention enforced by PostgreSQL itself.
--
-- An EXCLUDE constraint rejects any new or updated row whose
--   (resource_id equal) AND (time range overlapping)
-- matches an existing row - atomically, even when many transactions insert at
-- the same moment. A "check then insert" in application code cannot give that
-- guarantee because two requests can both pass the check before either inserts.
--
-- Details:
--   * tstzrange(start_time, end_time, '[)') is a half-open range: the end
--     instant is excluded, so 09:00-10:00 and 10:00-11:00 do NOT overlap.
--   * "&&" is the range-overlap operator.
--   * btree_gist lets the GiST index compare the UUID column with "=".
--   * WHERE (status = 'CONFIRMED') makes it a partial constraint: cancelled
--     reservations never block new bookings.
-- Violations raise SQLSTATE 23P01 (exclusion_violation); the API maps that to
-- HTTP 409 RESERVATION_CONFLICT.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "resource_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
