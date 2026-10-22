CREATE TYPE "TypeCourrier" AS ENUM (
    'ENTRANT',
    'SORTANT',
    'CIRCULAIRE',
    'ARRETE_MINISTERIEL'
);

CREATE TABLE "Courrier" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TypeCourrier" NOT NULL,
    "date" DATE NOT NULL,
    "objet" TEXT NOT NULL,
    "expediteur" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "personneId" INTEGER,
    "service" TEXT,
    "resume" TEXT NOT NULL,
    "documentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER NOT NULL,

    CONSTRAINT "Courrier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Courrier_reference_key" ON "Courrier"("reference");
CREATE UNIQUE INDEX "Courrier_documentId_key" ON "Courrier"("documentId");
CREATE INDEX "Courrier_date_idx" ON "Courrier"("date");
CREATE INDEX "Courrier_type_date_idx" ON "Courrier"("type", "date");
CREATE INDEX "Courrier_personneId_idx" ON "Courrier"("personneId");

ALTER TABLE "Courrier"
    ADD CONSTRAINT "Courrier_personneId_fkey"
    FOREIGN KEY ("personneId") REFERENCES "Personnes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Courrier"
    ADD CONSTRAINT "Courrier_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Documents"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Courrier"
    ADD CONSTRAINT "Courrier_auteurId_fkey"
    FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
