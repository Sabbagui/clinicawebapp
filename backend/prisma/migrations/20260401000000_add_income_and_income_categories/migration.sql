-- CreateTable income_categories
CREATE TABLE "income_categories" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "income_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "income_categories_name_key" UNIQUE ("name")
);

-- Insert default income categories
INSERT INTO "income_categories" ("id", "name", "label", "isDefault", "updatedAt") VALUES
  (gen_random_uuid(), 'HEALTH_INSURANCE', 'Convênio',          true, NOW()),
  (gen_random_uuid(), 'PRIVATE_PATIENT',  'Particular Extra',  true, NOW()),
  (gen_random_uuid(), 'PRODUCT_SALE',     'Venda de Produto',  true, NOW()),
  (gen_random_uuid(), 'PROCEDURE',        'Procedimento',      true, NOW()),
  (gen_random_uuid(), 'OTHER',            'Outros',            true, NOW());

-- CreateTable incomes
CREATE TABLE "incomes" (
  "id"          TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "categoryId"  TEXT NOT NULL,
  "date"        DATE NOT NULL,
  "notes"       TEXT,
  "receiptPath" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incomes_date_idx" ON "incomes"("date");

-- CreateIndex
CREATE INDEX "incomes_categoryId_date_idx" ON "incomes"("categoryId", "date");

-- AddForeignKey
ALTER TABLE "incomes"
  ADD CONSTRAINT "incomes_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "income_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes"
  ADD CONSTRAINT "incomes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
