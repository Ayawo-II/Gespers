-- Lien manquant entre un compte et sa fiche agent (déjà présent dans schema.prisma)
ALTER TABLE "Utilisateur" ADD COLUMN "personneId" INTEGER;

-- Champs de fiche agent utilisés par l'IHM (identité, contact et hiérarchie directe)
ALTER TABLE "Personnes"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "nationalite" TEXT,
  ADD COLUMN "situationMatrimoniale" TEXT,
  ADD COLUMN "formation" TEXT,
  ADD COLUMN "service" TEXT,
  ADD COLUMN "chefId" INTEGER;

CREATE INDEX "Personnes_chefId_idx" ON "Personnes"("chefId");
CREATE UNIQUE INDEX "Utilisateur_personneId_key" ON "Utilisateur"("personneId");

ALTER TABLE "Personnes"
  ADD CONSTRAINT "Personnes_chefId_fkey"
  FOREIGN KEY ("chefId") REFERENCES "Personnes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Utilisateur"
  ADD CONSTRAINT "Utilisateur_personneId_fkey"
  FOREIGN KEY ("personneId") REFERENCES "Personnes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un compte doit toujours être rattaché à une fiche. Aucun compte ne peut
-- exister à ce stade de l'historique (les migrations précédentes ne créaient
-- pas la colonne), la contrainte peut donc être posée directement.
ALTER TABLE "Utilisateur" ALTER COLUMN "personneId" SET NOT NULL;
