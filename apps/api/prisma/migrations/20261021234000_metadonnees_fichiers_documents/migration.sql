ALTER TABLE "Documents"
    ADD COLUMN "nomFichier" TEXT,
    ADD COLUMN "mimeType" TEXT,
    ADD COLUMN "tailleOctets" INTEGER;

INSERT INTO "typeDoc" ("libelle")
SELECT defaults."libelle"
FROM (
    VALUES
        ('piece_identite'),
        ('diplome'),
        ('arrete'),
        ('contrat'),
        ('decision'),
        ('justificatif_conge'),
        ('courrier'),
        ('autre')
) AS defaults("libelle")
WHERE NOT EXISTS (
    SELECT 1
    FROM "typeDoc" existing
    WHERE lower(existing."libelle") = lower(defaults."libelle")
);
