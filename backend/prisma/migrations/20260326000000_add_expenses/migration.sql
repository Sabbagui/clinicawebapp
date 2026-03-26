CREATE TYPE "ExpenseCategory" AS ENUM (
  'RENT', 'UTILITIES', 'SALARY', 'SUPPLIES', 'EQUIPMENT', 'MARKETING', 'OTHER'
);

CREATE TABLE "expenses" (
  "id"          TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "category"    "ExpenseCategory" NOT NULL,
  "date"        DATE NOT NULL,
  "notes"       TEXT,
  "receiptPath" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "expenses_date_idx" ON "expenses"("date");
CREATE INDEX "expenses_category_date_idx" ON "expenses"("category", "date");
