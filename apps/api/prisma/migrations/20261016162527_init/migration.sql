-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'CHEF_SECTION', 'CHEF_DIVISION', 'RESPONSABLE_RH', 'CHEF_PERSONNEL', 'DG');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "Categorie" AS ENUM ('D', 'C', 'B', 'A3', 'A2', 'A1');

-- CreateEnum
CREATE TYPE "Classe" AS ENUM ('CLASSE_3', 'CLASSE_2', 'CLASSE_1', 'CLASSE_PRINCIPALE', 'EXCEPTIONNELLE');

-- CreateEnum
CREATE TYPE "TypeAgent" AS ENUM ('FONCTIONNAIRE', 'CONTRACTUEL', 'PIVOTE');

-- CreateEnum
CREATE TYPE "EtatCarriere" AS ENUM ('STAGIAIRE', 'TITULAIRE', 'SORTI');

-- CreateEnum
CREATE TYPE "NatureModif" AS ENUM ('ECHELON', 'CLASSE', 'CATEGORIE');

-- CreateEnum
CREATE TYPE "ModeModif" AS ENUM ('AUTOMATIQUE', 'MANUEL');

-- CreateEnum
CREATE TYPE "ResultatExamen" AS ENUM ('ADMIS', 'AJOURNE');

-- CreateEnum
CREATE TYPE "MotifDepart" AS ENUM ('RETRAITE', 'DEMISSION', 'REVOCATION', 'DECES', 'AUTRE');

-- CreateTable
CREATE TABLE "Division" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "chefId" INTEGER,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "divisionId" INTEGER NOT NULL,
    "chefId" INTEGER,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectation" (
    "personneId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "affectation_pkey" PRIMARY KEY ("personneId","sectionId")
);

-- CreateTable
CREATE TABLE "Personnes" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "dateNaissance" DATE NOT NULL,
    "lieuNaissance" TEXT NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "nbreEnfant" INTEGER NOT NULL,
    "nomPersonnePrevenir" TEXT NOT NULL,
    "contactPersonnePrevenir" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "diplome" TEXT NOT NULL,
    "fonction" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "categorie" "Categorie" NOT NULL,
    "classe" "Classe" NOT NULL,
    "echelon" INTEGER NOT NULL,
    "indice" INTEGER NOT NULL,
    "typeAgent" "TypeAgent" NOT NULL,
    "etatCarriere" "EtatCarriere" NOT NULL,
    "dateEntree" DATE NOT NULL,
    "dateDebutStage" DATE,
    "dateFinStagePrevue" DATE,
    "dateFinContrat" DATE,
    "dateDernierAvancement" DATE,
    "dateDepart" DATE,
    "motifDepart" "MotifDepart",
    "estArchive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Personnes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mods" (
    "id" SERIAL NOT NULL,
    "ancCategorie" "Categorie" NOT NULL,
    "ancClasse" "Classe" NOT NULL,
    "ancEchelon" INTEGER NOT NULL,
    "ancFonction" TEXT NOT NULL,
    "nvCategorie" "Categorie" NOT NULL,
    "nvClasse" "Classe" NOT NULL,
    "nvEchelon" INTEGER NOT NULL,
    "nvFonction" TEXT NOT NULL,
    "dateEffet" DATE NOT NULL,
    "nature" "NatureModif" NOT NULL,
    "mode" "ModeModif" NOT NULL,
    "justification" TEXT,
    "personneId" INTEGER NOT NULL,
    "pieceJustificativeId" INTEGER,
    "modificateurId" INTEGER NOT NULL,

    CONSTRAINT "mods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Titularisation" (
    "id" SERIAL NOT NULL,
    "dateExamen" DATE NOT NULL,
    "resultat" "ResultatExamen" NOT NULL,
    "dateEffet" DATE NOT NULL,
    "referenceDecision" TEXT NOT NULL,
    "personneId" INTEGER NOT NULL,

    CONSTRAINT "Titularisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "typeDoc" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "typeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" SERIAL NOT NULL,
    "lien" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "numeroOrdre" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "expediteur" TEXT NOT NULL,
    "dateDocument" DATE NOT NULL,
    "dateAjout" DATE NOT NULL,
    "personneId" INTEGER NOT NULL,
    "typeDocId" INTEGER NOT NULL,
    "ajouteParId" INTEGER NOT NULL,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL,
    "dateDesactivation" DATE,
    "motifDesactivation" TEXT,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Division_chefId_key" ON "Division"("chefId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_chefId_key" ON "Section"("chefId");

-- CreateIndex
CREATE UNIQUE INDEX "Personnes_matricule_key" ON "Personnes"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "mods_pieceJustificativeId_key" ON "mods"("pieceJustificativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Titularisation_personneId_key" ON "Titularisation"("personneId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "Personnes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "Personnes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mods" ADD CONSTRAINT "mods_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mods" ADD CONSTRAINT "mods_pieceJustificativeId_fkey" FOREIGN KEY ("pieceJustificativeId") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mods" ADD CONSTRAINT "mods_modificateurId_fkey" FOREIGN KEY ("modificateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Titularisation" ADD CONSTRAINT "Titularisation_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_personneId_fkey" FOREIGN KEY ("personneId") REFERENCES "Personnes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_typeDocId_fkey" FOREIGN KEY ("typeDocId") REFERENCES "typeDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
