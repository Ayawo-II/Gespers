import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../middlewares/authenticate.js";
import { hasPermission } from "../middlewares/authorize.js";

export function agentReadWhere(
  user: AuthenticatedUser,
): Prisma.PersonnesWhereInput {
  if (hasPermission(user.role, "agents.read.all")) {
    return {};
  }

  if (hasPermission(user.role, "agents.read.team")) {
    if (user.role === "CHEF_SECTION") {
      return {
        OR: [
          { id: user.personneId },
          {
            affectations: {
              some: { section: { chefId: user.personneId } },
            },
          },
        ],
      };
    }

    if (user.role === "CHEF_DIVISION") {
      return {
        OR: [
          { id: user.personneId },
          {
            affectations: {
              some: {
                section: { division: { chefId: user.personneId } },
              },
            },
          },
        ],
      };
    }
  }

  return { id: user.personneId };
}

export function documentReadWhere(
  user: AuthenticatedUser,
): Prisma.DocumentsWhereInput {
  if (hasPermission(user.role, "documents.read.all")) return {};
  return {
    personnes: {
      some: { personne: { is: agentReadWhere(user) } },
    },
  };
}
