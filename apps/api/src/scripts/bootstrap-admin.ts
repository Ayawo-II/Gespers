import argon2 from "argon2";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";

async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const personneId = Number(process.env.BOOTSTRAP_ADMIN_PERSONNE_ID);
  if (!email || !password || !Number.isInteger(personneId) || personneId < 1) {
    throw new Error(
      "Définissez BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD et BOOTSTRAP_ADMIN_PERSONNE_ID.",
    );
  }
  if (password.length < 16) {
    throw new Error("Le mot de passe administrateur initial doit contenir au moins 16 caractères.");
  }

  const accountCount = await prisma.utilisateur.count();
  if (accountCount !== 0) {
    throw new Error("Le bootstrap est autorisé uniquement lorsqu’aucun compte n’existe.");
  }
  const person = await prisma.personnes.findUnique({
    where: { id: personneId },
    select: { id: true },
  });
  if (!person) {
    throw new Error("L’agent associé au compte administrateur est introuvable.");
  }

  const user = await prisma.utilisateur.create({
    data: {
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: Role.ADMIN_SYSTEME,
      personneId,
    },
    select: { id: true, email: true },
  });
  await prisma.journalAudit.create({
    data: {
      identifiant: "bootstrap système",
      action: "bootstrap_administrateur_systeme",
      cible: String(user.id),
      details: "Création initiale du compte administrateur système.",
    },
  });
  console.info(`Compte administrateur initial créé pour ${user.email}.`);
}

try {
  await bootstrapAdmin();
} catch (error) {
  console.error("Échec du bootstrap administrateur.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
