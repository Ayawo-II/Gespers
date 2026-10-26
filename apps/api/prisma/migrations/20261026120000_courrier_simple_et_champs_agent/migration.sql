-- AlterEnum
BEGIN;
CREATE TYPE "TypeCourrier_new" AS ENUM ('ENTRANT', 'SORTANT', 'CIRCULAIRE', 'COURRIER_SIMPLE');
ALTER TABLE "Courrier" ALTER COLUMN "type" TYPE "TypeCourrier_new" USING (
  CASE
    WHEN "type"::text = 'ARRETE_MINISTERIEL' THEN 'COURRIER_SIMPLE'
    ELSE "type"::text
  END::"TypeCourrier_new"
);
ALTER TYPE "TypeCourrier" RENAME TO "TypeCourrier_old";
ALTER TYPE "TypeCourrier_new" RENAME TO "TypeCourrier";
DROP TYPE "TypeCourrier_old";
COMMIT;

-- AlterTable
ALTER TABLE "Personnes" ADD COLUMN     "membreAral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photo" TEXT;
