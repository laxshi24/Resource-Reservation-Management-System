-- CreateTable
CREATE TABLE "resource_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resource_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "location" VARCHAR(150),
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_categories_name_key" ON "resource_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_categories_slug_key" ON "resource_categories"("slug");

-- CreateIndex
CREATE INDEX "resources_category_id_is_active_idx" ON "resources"("category_id", "is_active");

-- CreateIndex
CREATE INDEX "resources_is_active_name_idx" ON "resources"("is_active", "name");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "resource_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written constraints (not expressible in the Prisma schema)
-- ---------------------------------------------------------------------------

-- Resource names are unique ignoring case ("Room A" and "room a" clash).
CREATE UNIQUE INDEX "resources_name_lower_key" ON "resources" (LOWER("name"));

-- Data integrity checks enforced by the database itself.
ALTER TABLE "resources"
  ADD CONSTRAINT "resources_capacity_check" CHECK ("capacity" IS NULL OR ("capacity" BETWEEN 1 AND 1000)),
  ADD CONSTRAINT "resources_name_not_blank_check" CHECK (LENGTH(TRIM("name")) >= 2);
