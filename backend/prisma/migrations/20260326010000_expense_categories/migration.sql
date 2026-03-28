-- Create expense_categories table
CREATE TABLE "expense_categories" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_categories_name_key" UNIQUE ("name")
);

-- Insert default categories
INSERT INTO "expense_categories" ("id", "name", "label", "isDefault", "updatedAt") VALUES
  (gen_random_uuid(), 'RENT',      'Aluguel',       true, NOW()),
  (gen_random_uuid(), 'UTILITIES', 'Utilidades',    true, NOW()),
  (gen_random_uuid(), 'SALARY',    'Salários',      true, NOW()),
  (gen_random_uuid(), 'SUPPLIES',  'Insumos',       true, NOW()),
  (gen_random_uuid(), 'EQUIPMENT', 'Equipamentos',  true, NOW()),
  (gen_random_uuid(), 'MARKETING', 'Marketing',     true, NOW()),
  (gen_random_uuid(), 'OTHER',     'Outros',        true, NOW());

-- Add categoryId column to expenses (nullable first)
ALTER TABLE "expenses" ADD COLUMN "categoryId" TEXT;

-- Map existing enum values to new category IDs
UPDATE "expenses" e
SET "categoryId" = ec.id
FROM "expense_categories" ec
WHERE ec.name = e."category"::text;

-- Drop old enum column
ALTER TABLE "expenses" DROP COLUMN "category";

-- Make categoryId NOT NULL
ALTER TABLE "expenses" ALTER COLUMN "categoryId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old enum type
DROP TYPE IF EXISTS "ExpenseCategory";
