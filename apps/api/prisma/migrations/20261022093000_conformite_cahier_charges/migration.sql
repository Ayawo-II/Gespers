ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN_SYSTEME';

ALTER TABLE "Utilisateur"
    ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lockedUntil" TIMESTAMP(3);

ALTER TABLE "Conge"
    ADD COLUMN "documentId" INTEGER;

CREATE TABLE "DocumentVersion" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "lien" TEXT NOT NULL,
    "nomFichier" TEXT,
    "mimeType" TEXT,
    "tailleOctets" INTEGER,
    "remplaceLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remplaceParId" INTEGER NOT NULL,
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoriqueCarriere" (
    "id" SERIAL NOT NULL,
    "personneId" INTEGER NOT NULL,
    "etatAvant" "EtatCarriere",
    "etatApres" "EtatCarriere" NOT NULL,
    "dateEffet" DATE NOT NULL,
    "motif" TEXT,
    "auteurId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoriqueCarriere_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoriqueAffectation" (
    "id" SERIAL NOT NULL,
    "personneId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "auteurId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoriqueAffectation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PolitiqueConge" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "joursAnnuels" INTEGER NOT NULL DEFAULT 30,
    "reportIllimite" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PolitiqueConge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentVersion_documentId_remplaceLe_idx" ON "DocumentVersion"("documentId", "remplaceLe");
CREATE INDEX "HistoriqueCarriere_personneId_dateEffet_idx" ON "HistoriqueCarriere"("personneId", "dateEffet");
CREATE INDEX "HistoriqueAffectation_personneId_dateDebut_idx" ON "HistoriqueAffectation"("personneId", "dateDebut");

ALTER TABLE "DocumentVersion"
    ADD CONSTRAINT "DocumentVersion_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "DocumentVersion_remplaceParId_fkey"
    FOREIGN KEY ("remplaceParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HistoriqueCarriere"
    ADD CONSTRAINT "HistoriqueCarriere_personneId_fkey"
    FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "HistoriqueCarriere_auteurId_fkey"
    FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HistoriqueAffectation"
    ADD CONSTRAINT "HistoriqueAffectation_personneId_fkey"
    FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "HistoriqueAffectation_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "HistoriqueAffectation_auteurId_fkey"
    FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conge"
    ADD CONSTRAINT "Conge_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PolitiqueConge" ("id", "joursAnnuels", "reportIllimite")
VALUES (1, 30, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "HistoriqueCarriere"
    ("personneId", "etatAvant", "etatApres", "dateEffet", "motif")
SELECT p."id", NULL, 'STAGIAIRE'::"EtatCarriere",
       COALESCE(p."dateDebutStage", p."dateEntree"),
       'Situation de stagiaire conservée lors de la création du dossier.'
FROM "Personnes" p
WHERE p."etatCarriere" = 'STAGIAIRE'::"EtatCarriere";

INSERT INTO "HistoriqueCarriere"
    ("personneId", "etatAvant", "etatApres", "dateEffet", "motif")
SELECT t."personneId", 'STAGIAIRE'::"EtatCarriere", 'TITULAIRE'::"EtatCarriere",
       t."dateEffet",
       'Titularisation antérieure conservée dans le dossier.'
FROM "Titularisation" t
WHERE t."resultat" = 'ADMIS'::"ResultatExamen"
  AND NOT EXISTS (
      SELECT 1 FROM "HistoriqueCarriere" h
      WHERE h."personneId" = t."personneId"
        AND h."etatApres" = 'TITULAIRE'::"EtatCarriere"
  );

INSERT INTO "HistoriqueCarriere"
    ("personneId", "etatAvant", "etatApres", "dateEffet", "motif")
SELECT p."id",
       CASE WHEN t."personneId" IS NULL
            THEN 'STAGIAIRE'::"EtatCarriere"
            ELSE 'TITULAIRE'::"EtatCarriere"
       END,
       'SORTI'::"EtatCarriere",
       p."dateDepart",
       COALESCE(p."motifDepart"::TEXT, 'Départ antérieur conservé dans le dossier.')
FROM "Personnes" p
LEFT JOIN "Titularisation" t
       ON t."personneId" = p."id"
      AND t."resultat" = 'ADMIS'::"ResultatExamen"
WHERE p."etatCarriere" = 'SORTI'::"EtatCarriere"
  AND p."dateDepart" IS NOT NULL;

INSERT INTO "HistoriqueAffectation"
    ("personneId", "sectionId", "dateDebut", "dateFin")
SELECT a."personneId", a."sectionId", CURRENT_DATE, NULL
FROM "affectation" a;
