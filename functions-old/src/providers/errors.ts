export class ProviderQuotaError extends Error {
  constructor(public readonly provider: string) {
    super(`Quota fournisseur épuisé pour ${provider}`);
    this.name = "ProviderQuotaError";
  }
}

