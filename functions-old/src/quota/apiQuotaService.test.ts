import { describe, expect, it } from "vitest";
import { InMemoryApiUsageRepository } from "../test/inMemoryApiUsageRepository.js";
import { ApiQuotaService } from "./apiQuotaService.js";

describe("ApiQuotaService", () => {
  it("refuse un appel avant dépassement de la limite", async () => {
    const repository = new InMemoryApiUsageRepository();
    const quota = new ApiQuotaService(
      repository,
      () => new Date("2026-08-31T23:00:00Z"),
      { API_QUOTA_HUNTER: "2" },
    );

    expect((await quota.reserve("hunter")).allowed).toBe(true);
    expect((await quota.reserve("hunter")).allowed).toBe(true);
    const rejected = await quota.reserve("hunter");
    expect(rejected.allowed).toBe(false);
    expect(rejected.count).toBe(2);
  });

  it("remet automatiquement le compteur à zéro au changement de mois UTC", async () => {
    const repository = new InMemoryApiUsageRepository();
    let now = new Date("2026-08-31T23:59:59Z");
    const quota = new ApiQuotaService(
      repository,
      () => now,
      { API_QUOTA_PAPPERS: "1" },
    );

    expect((await quota.reserve("pappers")).allowed).toBe(true);
    expect((await quota.reserve("pappers")).allowed).toBe(false);
    now = new Date("2026-09-01T00:00:00Z");
    const september = await quota.reserve("pappers");
    expect(september.allowed).toBe(true);
    expect(september.reset).toBe(true);
    expect(september.count).toBe(1);
  });
});

