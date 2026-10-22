-- Scheduled advancement records are system-generated and do not have a user author.
ALTER TABLE "mods" ALTER COLUMN "modificateurId" DROP NOT NULL;

ALTER TABLE "mods" DROP CONSTRAINT "mods_modificateurId_fkey";
ALTER TABLE "mods" ADD CONSTRAINT "mods_modificateurId_fkey"
    FOREIGN KEY ("modificateurId") REFERENCES "Utilisateur"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
