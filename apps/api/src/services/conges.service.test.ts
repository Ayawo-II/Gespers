import assert from "node:assert/strict";
import test from "node:test";
import { calculateAnnualLeaveBalance } from "./conges.service.js";

test("annual leave balance carries all unused leave into the selected year", () => {
  const balance = calculateAnnualLeaveBalance(
    new Date("2024-06-15T00:00:00.000Z"),
    30,
    44,
    2026,
  );

  assert.deepEqual(balance, {
    annee: 2026,
    joursAnnuels: 30,
    joursCredites: 90,
    joursPris: 44,
    joursRestants: 46,
    reportIllimite: true,
  });
});

test("annual leave balance does not credit years before the agent starts", () => {
  const balance = calculateAnnualLeaveBalance(
    new Date("2026-01-01T00:00:00.000Z"),
    30,
    0,
    2025,
  );

  assert.equal(balance.joursCredites, 0);
  assert.equal(balance.joursRestants, 0);
});
