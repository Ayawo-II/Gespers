import assert from "node:assert/strict";
import test from "node:test";
import { agentReadWhere } from "./agent-access.js";
import type { AuthenticatedUser } from "../middlewares/authenticate.js";

function user(
  role: AuthenticatedUser["role"],
  personneId: number,
): AuthenticatedUser {
  return {
    id: 1,
    email: "test@example.com",
    role,
    personneId,
    mustChangePassword: false,
  };
}

test("an agent is scoped to their own record", () => {
  assert.deepEqual(agentReadWhere(user("AGENT", 17)), { id: 17 });
});

test("a section chief is scoped to self and assigned section members", () => {
  assert.deepEqual(agentReadWhere(user("CHEF_SECTION", 23)), {
    OR: [
      { id: 23 },
      { affectations: { some: { section: { chefId: 23 } } } },
    ],
  });
});

test("system administrators can read across the organization", () => {
  assert.deepEqual(agentReadWhere(user("ADMIN_SYSTEME", 31)), {});
});
