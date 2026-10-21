-- CreateEnum
CREATE TYPE "TypeConge" AS ENUM (
    'ANNUEL',
    'MALADIE',
    'MATERNITE',
    'PATERNITE',
    'PERMISSION_EXCEPTIONNELLE',
    'SANS_SOLDE'
);

-- CreateTable
CREATE TABLE "Conge" (
    "id" SERIAL NOT NULL,
    "personneId" INTEGER NOT NULL,
    "type" "TypeConge" NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "dureeJours" INTEGER NOT NULL,
    "referenceDecision" TEXT NOT NULL,
    "pieceJointe" TEXT,
    "auteurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER,
    "identifiant" TEXT,
    "action" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "justification" TEXT,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrilleAvancement" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "categories" "Categorie"[] NOT NULL DEFAULT ARRAY['A1', 'A2', 'A3', 'B', 'C', 'D']::"Categorie"[],
    "classes" "Classe"[] NOT NULL DEFAULT ARRAY['CLASSE_3', 'CLASSE_2', 'CLASSE_1', 'CLASSE_PRINCIPALE', 'EXCEPTIONNELLE']::"Classe"[],
    "echelons" TEXT[] NOT NULL DEFAULT ARRAY['1', '2', '3', '4', '5', '6']::TEXT[],
    "dureeEchelonMois" INTEGER NOT NULL DEFAULT 24,
    "dureeClasseMois" INTEGER NOT NULL DEFAULT 36,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrilleAvancement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conge_personneId_dateDebut_dateFin_idx" ON "Conge"("personneId", "dateDebut", "dateFin");

-- CreateIndex
CREATE INDEX "Conge_auteurId_idx" ON "Conge"("auteurId");

-- CreateIndex
CREATE INDEX "JournalAudit_date_idx" ON "JournalAudit"("date");

-- CreateIndex
CREATE INDEX "JournalAudit_auteurId_date_idx" ON "JournalAudit"("auteurId", "date");

-- AddForeignKey
ALTER TABLE "Conge" ADD CONSTRAINT "Conge_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conge" ADD CONSTRAINT "Conge_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create the initial configuration row used by the single advancement grid.
INSERT INTO "GrilleAvancement" ("id", "updatedAt")
VALUES (1, CURRENT_TIMESTAMP);
