import { describe, expect, it, vi } from "vitest";
import { ApiQuotaService } from "../quota/apiQuotaService.js";
import { InMemoryApiUsageRepository } from "../test/inMemoryApiUsageRepository.js";
import { enrichCompany } from "./companyEnrichment.js";
import { enrichDecisionMakers } from "./decisionMakerEnrichment.js";

describe("fallbacks pilotés par quota", () => {
  it("saute Hunter épuisé et appelle Apollo", async () => {
    const quota = new ApiQuotaService(
      new InMemoryApiUsageRepository(),
      () => new Date("2026-08-14T12:00:00Z"),
      { API_QUOTA_HUNTER: "0", API_QUOTA_APOLLO: "1" },
    );
    const hunter = { find: vi.fn(async () => []) };
    const apollo = {
      find: vi.fn(async () => [{ name: "Ada", role: "CTO" }]),
    };

    const result = await enrichDecisionMakers("example.fr", {
      quota,
      hunter,
      apollo,
    });

    expect(hunter.find).not.toHaveBeenCalled();
    expect(apollo.find).toHaveBeenCalledOnce();
    expect(result.source).toBe("apollo");
    expect(result.skippedForQuota).toEqual(["hunter"]);
  });

  it("conserve Sirene sans appeler Pappers quand son quota est épuisé", async () => {
    const quota = new ApiQuotaService(
      new InMemoryApiUsageRepository(),
      () => new Date("2026-08-14T12:00:00Z"),
      { API_QUOTA_PAPPERS: "0" },
    );
    const sirene = {
      find: vi.fn(async () => ({ siren: "123456789", name: "Acme" })),
    };
    const pappers = { enrich: vi.fn(async () => ({})) };

    const result = await enrichCompany("Acme", { quota, sirene, pappers });

    expect(sirene.find).toHaveBeenCalledOnce();
    expect(pappers.enrich).not.toHaveBeenCalled();
    expect(result.company.name).toBe("Acme");
    expect(result.pappersSkippedForQuota).toBe(true);
  });
});

