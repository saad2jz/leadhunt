import { describe, expect, it } from "vitest";
import { needProfileSchema } from "./schemas.js";
import { scoreCompany } from "./scoring.js";

describe("scoreCompany", () => {
  it("calcule séparément le fit et le timing", () => {
    const need = needProfileSchema.parse({
      solutionType: "Plateforme de cybersécurité",
      targetSizeMin: 50,
      targetSizeMax: 500,
      geoZones: ["France"],
      sectors: ["SaaS"],
      decisionRoles: ["CTO"],
    });
    const score = scoreCompany({
      sector: "SaaS B2B",
      size: 120,
      geo: "France",
      contacts: [{ role: "CTO" }],
      rawSignals: { hiring: true, lastSignalDate: "2026-08-01" },
    }, need, undefined, new Date("2026-08-14"));

    expect(score.fitScore).toBe(100);
    expect(score.timingScore).toBe(45);
  });
});
