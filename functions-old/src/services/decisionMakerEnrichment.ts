import { ProviderQuotaError } from "../providers/errors.js";
import type { DecisionMaker } from "../providers/types.js";
import type { ApiQuotaService } from "../quota/apiQuotaService.js";
import type { MeteredApiName } from "../quota/types.js";

interface ContactProvider {
  find(domain: string): Promise<DecisionMaker[]>;
}

export interface DecisionMakerResult {
  contacts: DecisionMaker[];
  source: MeteredApiName | null;
  skippedForQuota: MeteredApiName[];
}

export async function enrichDecisionMakers(
  domain: string,
  dependencies: {
    quota: ApiQuotaService;
    hunter: ContactProvider;
    apollo: ContactProvider;
  },
): Promise<DecisionMakerResult> {
  const skippedForQuota: MeteredApiName[] = [];
  const chain: Array<[MeteredApiName, ContactProvider]> = [
    ["hunter", dependencies.hunter],
    ["apollo", dependencies.apollo],
  ];

  for (const [apiName, provider] of chain) {
    const reservation = await dependencies.quota.reserve(apiName);
    if (!reservation.allowed) {
      skippedForQuota.push(apiName);
      continue;
    }

    try {
      const contacts = await provider.find(domain);
      if (contacts.length > 0) {
        return { contacts, source: apiName, skippedForQuota };
      }
    } catch (error) {
      if (!(error instanceof ProviderQuotaError)) throw error;
      await dependencies.quota.markProviderQuotaExhausted(apiName);
      skippedForQuota.push(apiName);
    }
  }

  return { contacts: [], source: null, skippedForQuota };
}

