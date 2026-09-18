-- Owner/admin submitted photos with rights attestation + review state
CREATE TABLE IF NOT EXISTS "restaurant_photo_submissions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rights_basis" TEXT NOT NULL,
    "attestation_text" TEXT NOT NULL,
    "credit" TEXT,
    "license" TEXT,
    "source_url" TEXT,
    "admin_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_photo_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "restaurant_photo_submissions_restaurant_id_idx"
  ON "restaurant_photo_submissions"("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_photo_submissions_submitted_by_id_idx"
  ON "restaurant_photo_submissions"("submitted_by_id");
CREATE INDEX IF NOT EXISTS "restaurant_photo_submissions_status_idx"
  ON "restaurant_photo_submissions"("status");

DO $$ BEGIN
  ALTER TABLE "restaurant_photo_submissions"
    ADD CONSTRAINT "restaurant_photo_submissions_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "restaurant_photo_submissions"
    ADD CONSTRAINT "restaurant_photo_submissions_submitted_by_id_fkey"
    FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
