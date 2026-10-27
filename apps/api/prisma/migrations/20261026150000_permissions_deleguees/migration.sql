CREATE TABLE "PermissionUtilisateur" (
    "utilisateurId" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,
    "accordeParId" INTEGER,
    "accordeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionUtilisateur_pkey" PRIMARY KEY ("utilisateurId", "permission")
);

CREATE INDEX "PermissionUtilisateur_accordeParId_idx" ON "PermissionUtilisateur"("accordeParId");

ALTER TABLE "PermissionUtilisateur"
    ADD CONSTRAINT "PermissionUtilisateur_utilisateurId_fkey"
    FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PermissionUtilisateur"
    ADD CONSTRAINT "PermissionUtilisateur_accordeParId_fkey"
    FOREIGN KEY ("accordeParId") REFERENCES "Utilisateur"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
