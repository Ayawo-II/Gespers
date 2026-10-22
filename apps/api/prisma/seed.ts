import {
  Categorie,
  Classe,
  EtatCarriere,
  Role,
  Sexe,
  TypeAgent,
  PrismaClient,
} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

export const DEMO_PASSWORD = "RadioLome2026!";

const d = (value: string) => new Date(`${value}T00:00:00.000Z`);

const DIVISION_LIBELLE = "Service du personnel";

const typeDocLibelles = [
  "Pièce d'identité",
  "Diplôme",
  "Arrêté",
  "Contrat",
  "Décision",
  "Justificatif de congé",
  "Courrier",
  "Autre",
];

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  for (const libelle of typeDocLibelles) {
    await prisma.typeDoc.upsert({
      where: { id: typeDocLibelles.indexOf(libelle) + 1 },
      update: { libelle },
      create: { libelle },
    });
  }

  const division = await (async () => {
    const existing = await prisma.division.findFirst({
      where: { libelle: DIVISION_LIBELLE },
      select: { id: true },
    });
    return (
      existing ??
      (await prisma.division.create({ data: { libelle: DIVISION_LIBELLE } }))
    );
  })();

  const personneData = {
    nom: "Agbéko",
    prenoms: "Yao Mensah",
    dateNaissance: d("1976-09-03"),
    lieuNaissance: "Kpalimé",
    sexe: Sexe.M,
    nbreEnfant: 2,
    nomPersonnePrevenir: "Agbéko Akossiwa",
    contactPersonnePrevenir: "+228 90 22 11 00",
    telephone: "+228 90 22 33 44",
    adresse: "Nyékonakpoè, Lomé",
    diplome: "Licence en administration",
    fonction: "Chef du personnel",
    typeAgent: TypeAgent.FONCTIONNAIRE,
    etatCarriere: EtatCarriere.TITULAIRE,
    categorie: Categorie.A2,
    classe: Classe.CLASSE_1,
    echelon: 4,
    indice: 920,
    dateEntree: d("2008-01-15"),
    email: "yao.agbeko@radiolome.tg",
    nationalite: "Togolaise",
    situationMatrimoniale: "Marié",
    formation: "Administration publique",
    service: DIVISION_LIBELLE,
  };

  const personne = await prisma.personnes.upsert({
    where: { matricule: "RL-2008-014" },
    update: personneData,
    create: { ...personneData, matricule: "RL-2008-014" },
  });

  const section = await (async () => {
    const existing = await prisma.section.findFirst({
      where: { libelle: "Personnel", divisionId: division.id },
      select: { id: true },
    });
    return (
      existing ??
      (await prisma.section.create({
        data: {
          libelle: "Personnel",
          divisionId: division.id,
          chefId: personne.id,
        },
      }))
    );
  })();

  await prisma.affectation.upsert({
    where: {
      personneId_sectionId: { personneId: personne.id, sectionId: section.id },
    },
    update: {},
    create: { personneId: personne.id, sectionId: section.id },
  });

  await prisma.division.update({
    where: { id: division.id },
    data: { chefId: personne.id },
  });

  await prisma.utilisateur.upsert({
    where: { email: "chef.personnel@radiolome.tg" },
    update: {
      role: Role.CHEF_PERSONNEL,
      isActive: true,
      personneId: personne.id,
      passwordHash,
      mustChangePassword: false,
    },
    create: {
      email: "chef.personnel@radiolome.tg",
      passwordHash,
      role: Role.CHEF_PERSONNEL,
      isActive: true,
      mustChangePassword: false,
      personneId: personne.id,
    },
  });

  const grille = await prisma.grilleAvancement.findUnique({ where: { id: 1 } });
  if (!grille) {
    await prisma.grilleAvancement.create({
      data: {
        id: 1,
        categories: [
          Categorie.A1,
          Categorie.A2,
          Categorie.A3,
          Categorie.B,
          Categorie.C,
          Categorie.D,
        ],
        classes: [
          Classe.CLASSE_3,
          Classe.CLASSE_2,
          Classe.CLASSE_1,
          Classe.CLASSE_PRINCIPALE,
          Classe.EXCEPTIONNELLE,
        ],
        echelons: ["1", "2", "3", "4", "5", "6"],
        dureeEchelonMois: 24,
        dureeClasseMois: 36,
      },
    });
  }

  console.log("Seed terminé.");
  console.log(
    `Compte de démonstration (mot de passe : ${DEMO_PASSWORD}) : chef.personnel@radiolome.tg (CHEF_PERSONNEL)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
