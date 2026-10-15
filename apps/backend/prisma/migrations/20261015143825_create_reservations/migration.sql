-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "booked_by" VARCHAR(100) NOT NULL,
    "purpose" VARCHAR(500),
    "start_time" TIMESTAMPTZ(3) NOT NULL,
    "end_time" TIMESTAMPTZ(3) NOT NULL,
    "status" "reservation_status" NOT NULL DEFAULT 'CONFIRMED',
    "cancelled_at" TIMESTAMPTZ(3),
    "cancellation_reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_resource_id_start_time_idx" ON "reservations"("resource_id", "start_time");

-- CreateIndex
CREATE INDEX "reservations_status_start_time_idx" ON "reservations"("status", "start_time");

-- CreateIndex
CREATE INDEX "reservations_start_time_idx" ON "reservations"("start_time");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written constraints (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

ALTER TABLE "reservations"
  -- A reservation must end after it starts (zero-length or negative intervals are invalid).
  ADD CONSTRAINT "reservations_time_order_check" CHECK ("end_time" > "start_time"),
  -- cancelled_at is set if and only if the reservation is cancelled.
  ADD CONSTRAINT "reservations_cancellation_consistency_check" CHECK (
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
    OR ("status" = 'CONFIRMED' AND "cancelled_at" IS NULL AND "cancellation_reason" IS NULL)
  ),
  ADD CONSTRAINT "reservations_booked_by_not_blank_check" CHECK (LENGTH(TRIM("booked_by")) >= 2);
