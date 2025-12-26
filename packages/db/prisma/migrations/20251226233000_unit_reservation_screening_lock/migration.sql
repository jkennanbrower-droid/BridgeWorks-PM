-- Leasing Pipeline v4.0 - Unit reservation screening lock + release reason code

ALTER TABLE "unit_reservations"
  ADD COLUMN IF NOT EXISTS "release_reason_code" VARCHAR(50);

-- Unique active screening lock per unit (allows coexisting SOFT/HARD holds)
CREATE UNIQUE INDEX IF NOT EXISTS "unit_reservations_one_active_screening_lock_per_unit"
ON "unit_reservations" ("unit_id")
WHERE "status" = 'ACTIVE' AND "kind" = 'SCREENING_LOCK';

COMMENT ON INDEX "unit_reservations_one_active_screening_lock_per_unit" IS
'Enforces one active SCREENING_LOCK per unit to prevent concurrent submit locks.';

