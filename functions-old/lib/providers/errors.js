"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderQuotaError = void 0;
class ProviderQuotaError extends Error {
    provider;
    constructor(provider) {
        super(`Quota fournisseur épuisé pour ${provider}`);
        this.provider = provider;
        this.name = "ProviderQuotaError";
    }
}
exports.ProviderQuotaError = ProviderQuotaError;
