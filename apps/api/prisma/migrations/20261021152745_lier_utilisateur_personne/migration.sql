/*
  Warnings:

  - The values [PIVOTE] on the enum `TypeAgent` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `personneId` on the `Documents` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TypeAgent_new" AS ENUM ('FONCTIONNAIRE', 'CONTRACTUEL', 'PIGISTE');
ALTER TABLE "Personnes" ALTER COLUMN "typeAgent" TYPE "TypeAgent_new" USING ("typeAgent"::text::"TypeAgent_new");
ALTER TYPE "TypeAgent" RENAME TO "TypeAgent_old";
ALTER TYPE "TypeAgent_new" RENAME TO "TypeAgent";
DROP TYPE "public"."TypeAgent_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Documents" DROP CONSTRAINT "Documents_personneId_fkey";

-- AlterTable
ALTER TABLE "Documents" DROP COLUMN "personneId",
ADD COLUMN     "dansRegistreGeneral" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "numeroOrdre" DROP NOT NULL,
ALTER COLUMN "reference" DROP NOT NULL,
ALTER COLUMN "expediteur" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Personnes" ALTER COLUMN "categorie" DROP NOT NULL,
ALTER COLUMN "classe" DROP NOT NULL,
ALTER COLUMN "echelon" DROP NOT NULL,
ALTER COLUMN "indice" DROP NOT NULL;

-- CreateTable
CREATE TABLE "document_personne" (
    "documentId" INTEGER NOT NULL,
    "personneId" INTEGER NOT NULL,

    CONSTRAINT "document_personne_pkey" PRIMARY KEY ("documentId","personneId")
);

-- AddForeignKey
ALTER TABLE "document_personne" ADD CONSTRAINT "document_personne_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_personne" ADD CONSTRAINT "document_personne_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
