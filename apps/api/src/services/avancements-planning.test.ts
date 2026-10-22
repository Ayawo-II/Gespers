import assert from "node:assert/strict";
import test from "node:test";
import { addMonths, getAdvancementDates } from "./avancements-planning.js";

test("addMonths clamps dates to the final day of shorter months", () => {
  assert.equal(
    addMonths(new Date("2026-01-31T00:00:00.000Z"), 1).toISOString(),
    "2026-02-28T00:00:00.000Z",
  );
});

test("class proposal eligibility starts at titularisation and never advances a trainee", () => {
  const titularized = getAdvancementDates(
    {
      dateEntree: new Date("2020-01-01T00:00:00.000Z"),
      dateDernierAvancement: null,
      etatCarriere: "TITULAIRE",
      classe: "CLASSE_3",
      echelon: 1,
      titularisation: { dateEffet: new Date("2022-06-15T00:00:00.000Z") },
      historique: [],
    },
    24,
    36,
  );
  const stagiaire = getAdvancementDates(
    {
      dateEntree: new Date("2024-01-01T00:00:00.000Z"),
      dateDernierAvancement: null,
      etatCarriere: "STAGIAIRE",
      classe: "CLASSE_3",
      echelon: 1,
      titularisation: null,
      historique: [],
    },
    24,
    36,
  );

  assert.equal(titularized.classe?.toISOString(), "2025-06-15T00:00:00.000Z");
  assert.equal(stagiaire.classe, null);
});
