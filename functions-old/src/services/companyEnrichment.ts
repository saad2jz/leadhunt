import { ProviderQuotaError } from "../providers/errors.js";
import type {
  CompanyIdentity,
  PappersEnrichment,
} from "../providers/types.js";
import type { ApiQuotaService } from "../quota/apiQuotaService.js";

interface SireneProvider {
  find(sirenOrName: string): Promise<CompanyIdentity>;
}

interface PappersProvider {
  enrich(siren: string): Promise<PappersEnrichment>;
}

export interface CompanyEnrichmentResult {
  company: CompanyIdentity;
  pappers: PappersEnrichment | null;
  pappersSkippedForQuota: boolean;
}

export async function enrichCompany(
  sirenOrName: string,
  dependencies: {
    quota: ApiQuotaService;
    sirene: SireneProvider;
    pappers: PappersProvider;
  },
): Promise<CompanyEnrichmentResult> {
  // Sirene est la source gratuite et reste toujours la base du résultat.
  const company = await dependencies.sirene.find(sirenOrName);
  const reservation = await dependencies.quota.reserve("pappers");

  if (!reservation.allowed) {
    return { company, pappers: null, pappersSkippedForQuota: true };
  }

  try {
    const pappers = await dependencies.pappers.enrich(company.siren);
    return { company, pappers, pappersSkippedForQuota: false };
  } catch (error) {
    if (!(error instanceof ProviderQuotaError)) throw error;
    await dependencies.quota.markProviderQuotaExhausted("pappers");
    return { company, pappers: null, pappersSkippedForQuota: true };
  }
}

